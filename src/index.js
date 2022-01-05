import '@logseq/libs';
import pos from 'pos';

const main = async () => {
  console.log('Keyword frequency plugin loaded');

  logseq.provideStyle(`
  .kwWrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
  }
  
  .kwEl {
    border: 1px dashed gray;
    padding: 8px;
    border-radius: 10px;
  }
  `);

  // Generate unique identifier
  const uniqueIdentifier = () =>
    Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, '');

  // Insert renderer upon slash command
  logseq.Editor.registerSlashCommand('keyword frequency', async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer :kwfx_${uniqueIdentifier()}}}`
    );
  });

  const filterNounArr = (str) => {
    // Empty object to store the final count
    let wordCounts = {};

    const words = new pos.Lexer().lex(str);
    const tagger = new pos.Tagger();
    const taggedWords = tagger.tag(words);

    let nounArr = [];
    for (let a of taggedWords) {
      if (
        a[1] === 'NN' &&
        a[0] !== '][' &&
        a[0] !== '-' &&
        a[0] !== '–' &&
        a[0] !== '—' &&
        a[0] !== '−' &&
        a[0] !== "'" &&
        a[0] !== '`' &&
        a[0] !== '´'
      ) {
        nounArr.push(a[0]);
      }
    }

    for (let i = 0; i < nounArr.length; i++) {
      wordCounts['_' + nounArr[i]] = (wordCounts['_' + nounArr[i]] || 0) + 1;
    }

    return wordCounts;
  };

  // Insert renderer
  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const uuid = payload.uuid;
    const [type] = payload.arguments;

    // Generate unique identifier for macro renderer so that more than one word counter can be implemented in the same page
    const id = type.split('_')[1]?.trim();
    const kwFxId = `kwfx_${id}`;

    // Find word counter block so as to track children under it
    const headerBlock = await logseq.Editor.getBlock(uuid, {
      includeChildren: true,
    });

    // Function to retrieve number of words
    const returnNumberOfMentions = async (type) => {
      if (!type.startsWith(':kwfx_')) {
        return;
      } else {
        let contentStr = '';

        // Begin recursion
        const getCount = async (childrenArr) => {
          for (let a = 0; a < childrenArr.length; a++) {
            contentStr = contentStr + ' ' + childrenArr[a].content;

            if (childrenArr[a].children) {
              getCount(childrenArr[a].children);
            } else {
              return;
            }
          }
        };

        await getCount(headerBlock.children);

        const filteredObjWithCount = filterNounArr(contentStr.toLowerCase());

        const sortedFilteredArr = Object.keys(filteredObjWithCount)
          .sort(function (a, b) {
            return filteredObjWithCount[a] - filteredObjWithCount[b];
          })
          .reverse();

        const renderKw = () => {
          let html = '';
          for (let i = 0; i < 30; i++) {
            for (let j in filteredObjWithCount) {
              if (sortedFilteredArr[i] === j) {
                html += `<div class="kwEl">${sortedFilteredArr[i].substring(
                  1
                )}: ${filteredObjWithCount[j]}</div>`;
              }
            }
          }
          return html;
        };

        logseq.provideUI({
          key: `${kwFxId}`,
          slot,
          reset: true,
          template: `<div id="${kwFxId}" data-key-id="${kwFxId}" class="kwWrapper">${renderKw()}</div>`,
        });
      }
    };

    await returnNumberOfMentions(type);
  });
};

logseq.ready(main).catch(console.error);
