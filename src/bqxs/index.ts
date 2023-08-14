import CryptoJS from "crypto-js";
import fs from "node:fs/promises";
import iconv from 'iconv-lite';
import path from "path";
import { Config } from '~src/interface'

const URL_INFO = "https://www.bqxs520.com";
const URL_CONTENT = "https://txt.yqkfqrc.com";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

const http = async (
  input: RequestInfo | URL,
  type: "json" | "text" | "buffer"
) => {
  const res = await fetch(input, {
    // ...init,
    method: "GET",
    headers: {
      "user-agent": USER_AGENT,
      accept: "*/*",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    },
    referrer: `${URL_INFO}/load.html`,
    referrerPolicy: "no-referrer-when-downgrade",
    body: null,
    mode: "cors",
    credentials: "omit",
  });

  switch(type) {
    case 'json':
      return await res.json();
    case 'buffer':
      return await res.arrayBuffer();
    case 'text':
    default:
      return await res.text();
  }
};

interface BookInfo {
  Chapters: { ID: string; Title: string }[];
  Title: string;
  Flag: boolean;
  HuabenID: number;
  Image: string;
  KeyTitle: string;
  Url: string;
}

// get info of book
const getBookInfo = async (sc: Config['bqxs']) => {
  const path = `${sc.bid}-${sc.kid}-${sc.cid}`;
  const token = CryptoJS.HmacMD5(path, USER_AGENT).toString();
  const url = `${URL_INFO}/read/info/${path}.js?token=${token}`;
  const res = await http(url, 'json');
  return res as BookInfo;
};

// get secret of chapter
const getSecret = async (token: string, cid: string | number) => {
  const url = `${URL_INFO}/read/Content/${cid}.js?token=${token}`;
  const res = await http(url, 'text');
  return res as string;
};

// get content of chapter
const getContent = async (token: string, secret: string) => {
  let url = URL_CONTENT;
  url += CryptoJS.AES.decrypt(
    secret,
    CryptoJS.enc.Utf8.parse(token.substring(0, 16)),
    {
      iv: CryptoJS.enc.Utf8.parse(token.substring(16)),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  ).toString(CryptoJS.enc.Utf8);
  url += "&t=" + new Date().valueOf();

  const res = await http(url, 'buffer');
  return res as ArrayBuffer;
};

// transfer text encoding, from gbk to utf-8
const bufferToString = (arrayBuffer: ArrayBuffer) => {
  const text = iconv.decode(Buffer.from(arrayBuffer), 'GBK');
  return text;
};

// resolve content of chapter
const resolveContent = (content: string) => {
  const lines = content.split(/\r\n/g);
  const htmlRows: string[] = [];
  const reg = /[。？！][a-z0-9\u4e00-\u9fa5]/gi;
  const badReg =
    /www|http|\.com|\.net|\.org|\.la|手打|笔趣阁|小说网|转码|小说APP|本小说来自|本作品来自|版小说|看书网|本站|天才一秒|加入书签/gi;
  const okReg = /[a-z0-9\u4e00-\u9fa5]/gi;
  const maxLength = 200;
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n].replace(/[\s+]/g, "");
    if (okReg.test(line) && !badReg.test(line)) {
      let last = maxLength;
      let first = 0;
      for (let index = 0; index < line.length; index++) {
        if (reg.test(line.substring(index, index + 2))) {
          last = index + 1;
        }
        if (index - first >= maxLength || index == line.length - 1) {
          const htmlRow = line.substring(first, last);
          first = last;
          index = first;
          last = first + maxLength;
          htmlRows.push(htmlRow);
        }
      }
    }
  }
  return htmlRows.join('\n');
};

// get one chapter content
const getOneChapter = async (cid: string | number) => {
  const token = CryptoJS.HmacMD5(cid.toString(), USER_AGENT).toString();
  const secret = await getSecret(token, cid);
  const contentBuffer = await getContent(token, secret);
  const contentString = bufferToString(contentBuffer);
  const resolvedContentString = resolveContent(contentString);
  return resolvedContentString
};

// create dir if not exist
const createDir = async (targetDir: string) => {
  if(!(await isExist(targetDir))) {
    await fs.mkdir(targetDir);
  }
}

// if the chapter exists
const isExist = async (target: string) => {
  // write file if not exist
  try {
    await fs.access(target);
  } catch {
    return false;
  }
  return true
}

// save chapter file
const saveAsFile = async (targetFile: string, content: string) => {
  await fs.writeFile(targetFile, content);
};

// func entry
export async function main({ bqxs: config }: Config) {
  const targetDir = path.join(config.saveDir);
  await createDir(targetDir);
  // const bookInfo = await getBookInfo(config);
  // let retryCount = 0;
  // for(let i = config.startIndex ?? 0, end = (config.endIndex ?? bookInfo.Chapters.length); i < end; i++) {
  //   try {
  //     const chapter = bookInfo.Chapters[i];
  //     const content = await getOneChapter(chapter.ID);
  //     const fileName = `No.${i.toString().padStart(4, '0')}.${chapter.Title}.txt`;
  //     const targetFile = path.join(__dirname, config.saveDir, fileName);

  //     if(await isExist(targetFile)) {
  //       continue;
  //     }

  //     saveAsFile(targetFile, content);
  //     retryCount = 0;
  //   } catch (err) {
  //     console.log(err);
  //     retryCount++;
  //     if(retryCount < 5) {
  //       i--;
  //     }
  //   }
  // }
  await saveAsFile(path.join(targetDir, 'test-file.txt'), 'hello world');
  
}
