/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,svelte}"],
  theme: {
    extend: {
      colors: {
        /* GitHub UI colours (determined with color picker from GitHub website) */
        githubPrimaryTextColor: '#202328',    /* Primary text (dark) */
        githubSecondaryTextColor: '#5b636d',  /* Secondary text (lighter) and most icons */
        githubBgColor: '#f6f8fa',             /* Header, columns, buttons, etc. */
        githubBorderColor: '#d2d9df',         /* Borders of of buttons, tables, text fields, columns, etc. */
        githubBoxLinkHoverBgColor: '#eaedf0', /* Background on hover for black links (no non-hover background) */
        githubActionColor: '#2e67d3',         /* Link on hover colour, focus frame colour */
        githubBadgeBgColor: '#e8ebee',        /* Column item count badge background (text is githubSecondaryTextColor) */
        githubButtonTextColor: '#26292e',     /* Button text */
        githubTooltipBgColor: '#26292e',      /* Tooltip background (same as button text) */
        githubTooltipTextColor: '#fff',       /* Tooltip text (white) */
        githubButtonHoverBgColor: '#f0f2f5',  /* Button background on hover (non-hover background is githubBgColor) */
        githubDividerColor: '#e0e4e9',        /* Divider lines in menus, etc. */
        githubAccentColor: '#ee9279',         /* Accent colour for tabs, etc. */
        githubGreenColor: '#428646',          /* Green buttons */
        githubRedColor: '#c03737',            /* Red links */
        githubRedHoverBgColor: '#fcecea',     /* Red links hover background */
        /* SortableJS drag-and-drop */
        sortableChosenBgColor: '#d6e4f5',     /* Dragged element background during drag */
        /* Label colours (from https://gist.github.com/borekb/d61cdc45f0c92606a92b15388cf80185) */
        labelColor1: '#b60205',
        labelColor2: '#d93f0b',
        labelColor3: '#fbca04',
        labelColor4: '#0e8a16',
        labelColor5: '#006b75',
        labelColor6: '#1d76db',
        labelColor7: '#0052cc',
        labelColor8: '#5319e7',
      },
    },
    fontFamily: {
      /* Font stack used by GitHub (according to ChatGPT) */
      sans: [
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ],
    },
  },
  plugins: [],
};
