import React, { MouseEventHandler } from 'react';
import { useSlate } from 'slate-react';
import {
  toggleBlock,
  toggleMark,
  isBlockActive,
  isMarkActive,
  getActiveBlock,
} from './helpers';
import { CustomElementType } from './CustomElement';
import { CustomText } from './CustomLeaf';

import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import CodeIcon from '@mui/icons-material/Code';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import AddLinkIcon from '@mui/icons-material/AddLink';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

import { OverridableComponent } from '@mui/material/OverridableComponent';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import { SvgIconTypeMap } from '@mui/material/SvgIcon';
import Container from '@mui/material/Container';

interface ButtonProps {
  active: boolean;
  onMouseDown: MouseEventHandler<HTMLButtonElement>;
}

const Button: React.FC<ButtonProps> = ({ active, children, onMouseDown }) => (
  <button
    onMouseDown={onMouseDown}
    style={{
      backgroundColor: active ? '#333' : 'white',
      color: active ? 'white' : '#333',
      border: '1px solid #eee',
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

interface BlockButtonProps {
  format: CustomElementType;
  icon: OverridableComponent<SvgIconTypeMap<{}, 'svg'>>;
}

const BlockButton: React.FC<BlockButtonProps> = ({ format, icon: Icon }) => {
  const editor = useSlate();
  return (
    <Button
      active={isBlockActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
    >
      <Icon />
    </Button>
  );
};

const BlockSelect: React.FC = () => {
  const editor = useSlate();
  const typesMap: [CustomElementType, JSX.Element][] = [
    [
      CustomElementType.paragraph,
      <p style={{ padding: 0, margin: 0 }}>Normal Text</p>,
    ],
    [
      CustomElementType.headingOne,
      <h1 style={{ padding: 0, margin: 0 }}>Heading 1</h1>,
    ],
    [
      CustomElementType.headingTwo,
      <h2 style={{ padding: 0, margin: 0 }}>Heading 2</h2>,
    ],
    [
      CustomElementType.headingThree,
      <h3 style={{ padding: 0, margin: 0 }}>Heading 3</h3>,
    ],
    [
      CustomElementType.headingFour,
      <h4 style={{ padding: 0, margin: 0 }}>Heading 4</h4>,
    ],
    [
      CustomElementType.headingFive,
      <h5 style={{ padding: 0, margin: 0 }}>Heading 5</h5>,
    ],
    [
      CustomElementType.headingSix,
      <h6 style={{ padding: 0, margin: 0 }}>Heading 6</h6>,
    ],
  ];

  return (
    <FormControl
      variant="standard"
      sx={{ m: 1, minWidth: 200, margin: '0' }}
      size="small"
    >
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={getActiveBlock(
          editor,
          typesMap.map((type) => type[0])
        ) || typesMap[0][0]}
        onChange={(event) => {
          toggleBlock(editor, event.target.value as CustomElementType);
        }}
        sx={{
          '*': {
            fontSize: '0.8rem',
            fontWeight: 400,
            fontVariant: 'normal',
          },
        }}
      >
        {typesMap.map((type) => (
          <MenuItem value={type[0]} key={type[0]}>
            {type[1]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

interface MarkButtonProps {
  format: keyof CustomText;
  icon: OverridableComponent<SvgIconTypeMap<{}, 'svg'>>;
}

const MarkButton: React.FC<MarkButtonProps> = ({ format, icon: Icon }) => {
  const editor = useSlate();
  return (
    <Button
      active={isMarkActive(editor, format)}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      <Icon />
    </Button>
  );
};

export const EditorToolbar: React.FC = () => {
  return (
    <Container sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
      <BlockSelect />
      <div>
        <MarkButton format="bold" icon={FormatBoldIcon} />
        <MarkButton format="italic" icon={FormatItalicIcon} />
        <MarkButton format="underline" icon={FormatUnderlinedIcon} />
        <MarkButton format="code" icon={CodeIcon} />
      </div>
      <div>
        <BlockButton
          format={CustomElementType.numberedList}
          icon={FormatListNumberedIcon}
        />
        <BlockButton
          format={CustomElementType.bulletedList}
          icon={FormatListBulletedIcon}
        />
        <BlockButton
          format={CustomElementType.blockQuote}
          icon={FormatQuoteIcon}
        />
        <BlockButton
          format={CustomElementType.link}
          icon={AddLinkIcon}
        />
      </div>
    </Container>
  );
};
