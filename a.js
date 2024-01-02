import * as fs from 'node:fs';

export function getOptionsFromLivePage(data) {
  let apiKey;
  const keyResult = data.match(/['"]INNERTUBE_API_KEY['"]:\s*['"](.+?)['"]/)
  if (keyResult) {
    apiKey = keyResult[1]
  } else {
    throw new Error("API Key was not found")
  }

  let clientVersion;
  const verResult = data.match(/['"]clientVersion['"]:\s*['"]([\d.]+?)['"]/)
  if (verResult) {
    clientVersion = verResult[1]
  } else {
    throw new Error("Client Version was not found")
  }

  let continuation;
  const continuationResult = data.match(/['"]continuation['"]:\s*['"](.+?)['"]/)
  if (continuationResult) {
    continuation = continuationResult[1]
  } else {
    throw new Error("Continuation was not found")
  }

  return {
    apiKey,
    clientVersion,
    continuation,
  }
}


async function fetchChat(options) {
  const url = `https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?key=${options.apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      context: {
        client: {
          clientVersion: options.clientVersion,
          clientName: "WEB",
        },
      },
      continuation: options.continuation,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return res.json()
}



const main = async () => {
  const liveId = 'SABmm1fK5_0';
  const result = await fetch(`https://www.youtube.com/watch?v=${liveId}`);
  const text = await result.text();
  await fs.promises.writeFile(`/home/aabccd021/tmp/live-${liveId}.html`, text);
  const options = getOptionsFromLivePage(text);
  console.log(options);

  process.on('SIGINT', async () => {
    process.exit(0);
  });

  while (true) {
    const data = await fetchChat(options);
    const actions = data.continuationContents.liveChatContinuation.actions;
    if (actions === undefined) {
      console.log(JSON.stringify(json, null, 2));
      return;
    }
    const chats = actions.map((action) => {
      const messageRenderer = action?.addChatItemAction?.item?.liveChatTextMessageRenderer;
      if (messageRenderer === undefined) {
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

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main();
