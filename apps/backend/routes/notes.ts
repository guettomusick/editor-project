import express from 'express';
import { WebsocketRequestHandler } from 'express-ws';

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';
import * as ws from 'ws';
import { slateNodesToInsertDelta } from '@slate-yjs/core';

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Node } from 'slate';

const db = getFirestore();

const initialValue = [{ type: 'paragraph', children: [{ text: '' }] }];

// Patch `express.Router` to support `.ws()` without needing to pass around a `ws`-ified app.
// https://github.com/HenningM/express-ws/issues/86
// eslint-disable-next-line @typescript-eslint/no-var-requires
const patch = require('express-ws/lib/add-ws-method');
patch.default(express.Router);

const router = express.Router();

export interface NoteResponse {
  id: string
  title: string
  content?: Y.XmlText
}

enum DOC_STATUS {
  INITIALIZED = 0,
  INITIALIZING = 1,
  NOT_INITIALIZED = 2,
}

const updateHandler = async (update: Uint8Array, _: unknown, doc: WSSharedDoc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  doc.conns.forEach((_, conn) => send(conn, message, doc.conns, doc));

  const yTitle = doc.getText('title')
  
  if (doc.initialized === DOC_STATUS.INITIALIZED) {
    const docRef = db.collection('docs').doc(doc.id);
    await docRef.update({
      updates: FieldValue.arrayUnion(Buffer.from(update).toString('base64')),
      title: yTitle.toString(),
    });
  }
  allMap.set(doc.id, yTitle.toString())
};

const transformPersistedDoc = (doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>): Y.Doc => {
  const yDoc = new Y.Doc();

  const updates = doc.data()?.updates || [];
  yDoc.transact(() => {
    for (let i = 0; i < updates.length; i++) {
      const update = Buffer.from(updates[i], 'base64')
      Y.applyUpdate(yDoc, update);
    }
  });

  return yDoc;
}

const getPersistedDoc = async (id: string) => {
  const docRef = db.collection('docs').doc(id);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    await docRef.set({
      title: '',
      updates: [],
    });

    allMap.set(id, '')
  }

  return transformPersistedDoc(doc)
};

class WSSharedDoc extends Y.Doc {
  /**
   * @param {string} name
   */
  id: string;
  title: string;
  conns: Map<ws, Set<number>>;
  awareness: awarenessProtocol.Awareness;
  initialized: DOC_STATUS;

  constructor(id: string, title = '') {
    super();
    this.title = title;
    this.id = id;
    this.gc = true;
    this.initialized = DOC_STATUS.NOT_INITIALIZED;
    /**
     * Maps from conn to set of controlled user ids. Delete all user ids from awareness when this conn is closed
     * @type {Map<Object, Set<number>>}
     */
    this.conns = new Map();
    /**
     * @type {awarenessProtocol.Awareness}
     */
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);
    /**
     * @param {{ added: Array<number>, updated: Array<number>, removed: Array<number> }} changes
     * @param {Object | null} conn Origin is the connection that made the change
     */
    const awarenessChangeHandler = (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      conn: ws
    ) => {
      const changedClients = added.concat(updated, removed);
      if (conn !== null) {
        const connControlledIDs =
          /** @type {Set<number>} */ this.conns.get(conn);
        if (connControlledIDs !== undefined) {
          added.forEach((clientID) => {
            connControlledIDs.add(clientID);
          });
          removed.forEach((clientID) => {
            connControlledIDs.delete(clientID);
          });
        }
      }
      // broadcast awareness update
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const buff = encoding.toUint8Array(encoder);
      this.conns.forEach((_, c) => {
        send(c, buff, this.conns, this);
      });
    };
    
    this.on('update', updateHandler);
    this.awareness.on('update', awarenessChangeHandler);
  }

  async initialize() {
    if (this.initialized === DOC_STATUS.NOT_INITIALIZED) {
      this.initialized = DOC_STATUS.INITIALIZING;
      const persistedYDoc = await getPersistedDoc(this.id);
      Y.applyUpdate(this, Y.encodeStateAsUpdate(persistedYDoc));
      this.initialized = DOC_STATUS.INITIALIZED;

      // If doc it's empty add initial slate value (required)
      const sharedRoot = this.get('content', Y.XmlText) as Y.XmlText;
      if (sharedRoot.length === 0) {
        const insertDelta = slateNodesToInsertDelta(initialValue as Node[]);
        sharedRoot.applyDelta(insertDelta);
      }
    }
  }
}

const docs = new Map();

const getYDoc = (docName: string) => {
  const YDoc = map.setIfUndefined(docs, docName, () => {
    const doc = new WSSharedDoc(docName);
    return doc;
  }) as WSSharedDoc;

  return YDoc;
};

const messageSync = 0;
const messageAwareness = 1;

const closeConn = (conn: ws, conns: Map<ws, Set<number>>, doc?: WSSharedDoc) => {
  if (conns.has(conn)) {
    /**
     * @type {Set<number>}
     */
    const controlledIds = conns.get(conn);
    conns.delete(conn);

    if (doc) {
      if (controlledIds) {
        awarenessProtocol.removeAwarenessStates(
          doc.awareness,
          Array.from(controlledIds),
          null
        );
      }
      if (conns.size === 0) {
        // if persisted, we store state and destroy ydocument
        doc.destroy();
        docs.delete(doc.id);
      }
    }
  }
  conn.close();
};

const send = (conn: ws, m: unknown, conns: Map<ws, Set<number>>, doc?: WSSharedDoc) => {
  if (conn.readyState !== ws.CONNECTING && conn.readyState !== ws.OPEN) {
    closeConn(conn, conns, doc);
  }
  try {
    conn.send(
      m,
      /** @param {any} err */ (err) => {
        err != null && closeConn(conn, conns, doc);
      }
    );
  } catch (e) {
    closeConn(conn, conns, doc);
  }
};

const pingTimeout = 30000;

const noteHandler: WebsocketRequestHandler = async (ws, req) => {
  const doc = getYDoc(req.params.id);
  doc.conns.set(ws, new Set());
  await doc.initialize()

  ws.on('message', (message) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(
        new Uint8Array(message as ArrayBuffer)
      );
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, doc, null);

          // If the `encoder` only contains the type of reply message and no
          // message, there is no need to send the message. When `encoder` only
          // contains the type of reply, its length is 1.
          if (encoding.length(encoder) > 1) {
            send(ws, encoding.toUint8Array(encoder), doc.conns, doc);
          }
          break;
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(
            doc.awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
          break;
        }
      }
    } catch (err) {
      console.error(err);
      doc.emit('error', [err]);
    }
  });

  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (doc.conns.has(ws)) {
        closeConn(ws, doc.conns, doc);
      }
      clearInterval(pingInterval);
    } else if (doc.conns.has(ws)) {
      pongReceived = false;
      try {
        ws.ping();
      } catch (e) {
        closeConn(ws, doc.conns, doc);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  ws.on('close', () => {
    closeConn(ws, doc.conns, doc);
    clearInterval(pingInterval);
  });
  ws.on('pong', () => {
    pongReceived = true;
  });
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(ws, encoding.toUint8Array(encoder), doc.conns, doc);
    const awarenessStates = doc.awareness.getStates();

    if (awarenessStates.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          doc.awareness,
          Array.from(awarenessStates.keys())
        )
      );
      send(ws, encoding.toUint8Array(encoder), doc.conns, doc);
    }
  }
};

const allDoc = new Y.Doc()
const allMap = allDoc.getMap('all')
const allConns: Map<ws, Set<number>> = new Map()

db.collection('docs').get().then((docs) => docs.forEach(doc => {
  allMap.set(doc.id, doc.data()?.title || '')
}))

allDoc.on('update', (update: Uint8Array) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);
  allConns.forEach((_, conn) => send(conn, message, allConns));
})

const notesHandler: WebsocketRequestHandler = (ws) => {
  allConns.set(ws, new Set());

  ws.on('message', (message) => {
    try {
      const encoder = encoding.createEncoder();
      const decoder = decoding.createDecoder(
        new Uint8Array(message as ArrayBuffer)
      );
      const messageType = decoding.readVarUint(decoder);
      switch (messageType) {
        case messageSync:
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.readSyncMessage(decoder, encoder, allDoc, null);

          // If the `encoder` only contains the type of reply message and no
          // message, there is no need to send the message. When `encoder` only
          // contains the type of reply, its length is 1.
          if (encoding.length(encoder) > 1) {
            send(ws, encoding.toUint8Array(encoder), allConns);
          }
          break;
      }
    } catch (err) {
      console.error(err);
      allDoc.emit('error', [err]);
    }
  });

  // Check if connection is still alive
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      if (allConns.has(ws)) {
        closeConn(ws, allConns);
      }
      clearInterval(pingInterval);
    } else if (allConns.has(ws)) {
      pongReceived = false;
      try {
        ws.ping();
      } catch (e) {
        closeConn(ws, allConns);
        clearInterval(pingInterval);
      }
    }
  }, pingTimeout);
  ws.on('close', () => {
    closeConn(ws, allConns);
    clearInterval(pingInterval);
  });
  ws.on('pong', () => {
    pongReceived = true;
  });
  // put the following in a variables in a block so the interval handlers don't keep in in
  // scope
  {
    // send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, allDoc);
    send(ws, encoding.toUint8Array(encoder), allConns);
  }
};

router.ws('/all', notesHandler);
router.ws('/:id', noteHandler);

export default router;
