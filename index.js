import { chromium } from 'playwright';
import * as fs from 'node:fs';

const main = async () => {
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/live_chat?is_popout=1&v=QJpUDRkVZ7c');

  page.on('response', async (response) => {
    if (response.url().startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat")) {
      const json = await response.json();
      // const jsonStr = JSON.stringify(json, null, 2);
      // const timestamp = Date.now();
      // await fs.promises.writeFile(`/home/aabccd021/tmp/chat-${timestamp}.json`, jsonStr);
      const actions = json.continuationContents.liveChatContinuation.actions;
      if (actions === undefined) {
        console.log("actions is undefined");
        console.log(JSON.stringify(json, null, 2));
        return;
      }
      const chats = actions.map((action) => {
        const messageRenderer = action?.addChatItemAction?.item?.liveChatTextMessageRenderer;
        if (messageRenderer === undefined) {
          console.log("messageRenderer is undefined");
          console.log(JSON.stringify(action, null, 2));
          return undefined;
        }
        return {
          message: messageRenderer.message.runs.map((run) => run.text).join(""),
          authorName: messageRenderer.authorName.simpleText,
          authorPhoto: messageRenderer.authorPhoto.thumbnails[0].url,
          timestamp: new Date(parseInt(messageRenderer.timestampUsec)/1000).toLocaleString(),
        };
      }).filter((chat) => chat !== undefined);
      console.log(chats);
    }
  })


  process.on('SIGINT', async () => {
    await browser.close();
    process.exit(0);
  });

  browser.on('disconnected', async () => {
    process.exit(0);
  });
}

main();
