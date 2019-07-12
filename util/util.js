const fse = require('fs-extra');
const fs = require('fs');
const TurndownService = require('turndown')
const turndownService = new TurndownService()

const stringFromArray = (website_content_array) => {
  let final_string = '';
  for (const final_string_section of website_content_array) {
    final_string += final_string_section;
  }
  return final_string;
}

// TODO replace the links within the md file to sections within the ebook itself.
const filterContent = (content) => (
  content
    .replace(/(?=<!--)([\s\S]*?)-->/g, '') // <!-- -->
    .replace(/<\/?a[^>]*>/g, '') // </ a tag references>
    .replace(/{{< hr[23456g] "/g, '\n\n### ')
    .replace(/{{< hr[1] "/g, '\n\n## ')
    .replace(/" >}}/g, '\n\n')
    .replace(/\\-/g, '-')
    .replace(/\\#/g, '\n#')
    .replace(/[#]{2}/g, '\n##')
    .replace(/- /g, '\n- ')
    .replace(/[\\*]{2}/g, '*')
    // .replace(/\. /g, '. \n')
    .replace(/8{3}/g, '\n')
    .replace(/{{< nfd\\_button [\S ]+/ig, '\n')
    .replace(/{{< nfd\\_center\\_title [\S ]+/ig, '\n')

    // .replace(/<hr class="hrul"\/>/g, '')
    // .replace(/<hr class="hrul__bottom"\/>/g, '')
);

const getHead = (fileContents) => {
    const headRegex = new RegExp(/---(.|[\r\n])+---/);
    const head = fileContents.match(headRegex)[0];

    const rawWithHTMLContent = fileContents.split('---')[2];
    const rawWithMDContent = turndownService.turndown(content);
    const content = filterContent(rawWithMDContent)
    console.log(content);

    return {
      head,
      content,
    }
}

const extractHeadContents = (headContents) => {
  const draftRegex = new RegExp(/draft: .+/);
  const rawDraft = headContents.match(draftRegex)[0];
  const draft = rawDraft.split(':')[1];

  const titleRegex = new RegExp(/title: .+/);
  const rawTitle = headContents.match(titleRegex)[0];
  const title = rawTitle.split('"')[1].replace('"', '');

  const dateRegex = new RegExp(/date: .+/);
  const rawDate = headContents.match(dateRegex)[0];
  const date = rawDate.split(':')[1];

  return {
    draft,
    title,
    date,
  }
}

const extractData = (file_contents, file_name, type) => {
  const { head, content } = getHead(file_contents);
  const { draft, title, date } = extractHeadContents(head);

  if (draft.trim() === 'false') {
    const new_list_item = { draft, head, content, title, date };
    switch(type) {
      case "page":
        return {
          new_list_item,
          new_string_item: `# ${title}\n${content}\n\n\n`, // \n${date}
        }

      case "page_children":
        return {
          new_list_item,
          new_string_item: file_name === '_index.md' ? (
            `# ${title}\n` // \n${date}
          ) : (
            `\n${content}\n`
          )
        }

      case "content":
        return {
          new_list_item,
          new_string_item: `# ${title}\n${content}\n\n\n`, // \n${date}
        }
    }
  } else {
    return {
      new_list_item: {},
      new_string_item: '',
    }
  }
}

const generatePage = async (folder) => {
  try {
    const file_contents = await fse.readFile(`${folder}/_index.md`, 'utf8');
    let new_list = [];
    let new_string = '';
    if (file_contents) {
      const { new_list_item, new_string_item } = extractData(file_contents, '_index.md', 'page');
      new_list.push(new_list_item);
      new_string += new_string_item;
    }
    return {
      list: new_list,
      string: new_string,
    }
  } catch (error) {
    throw new Error(`generatePage - ${error}`);
  }
}

const generatePageChildren = async (folder_path) => {
  const list = fs.readdirSync(folder_path);
  let new_list = [];
  let new_string = '';
  try {
    for (const file_name of list) {
      const file_contents = await fse.readFile(`${folder_path}/${file_name}`, 'utf8');
      const { new_list_item, new_string_item } = extractData(file_contents, file_name, 'page_children');
      new_list.push(new_list_item);
      new_string += new_string_item;
    }

    return {
      list: new_list,
      string: new_string,
    }
  } catch (error) {
    throw new Error(`generatePageChildren - ${folder_path} - ${error}`);
  }
}

const generateContent = async (folder) => {
  const list = fs.readdirSync(folder);
  let new_list = [];
  let new_string = '';
  try {
    for (const file_name of list) {
      const file_contents = await fse.readFile(`${folder}/${file_name}`, 'utf8');
      const { new_list_item, new_string_item } = extractData(file_contents, file_name, 'content');
      new_list.push(new_list_item);
      new_string += new_string_item;
    }
    return {
      list: new_list,
      string: new_string,
    }
  } catch (error) {
    throw new Error(`generateContent - ${error}`);
  }
}

require('dotenv').config();
const B2 = require('backblaze-b2');

const backblazeAuthorisation = () => {
  const b2 = new B2({
    applicationKeyId: process.env.B2_ACCOUNT_ID, // or accountId: 'accountId'
    applicationKey: process.env.B2_APPLICATION_KEY // or masterApplicationKey
  });

  return b2;
}

// const uploadNewFile = () => {
//   b2.uploadFile({
//     uploadUrl: 'uploadUrl',
//     uploadAuthToken: 'uploadAuthToken',
//     fileName: 'fileName',
//     contentLength: 0, // optional data length, will default to data.byteLength or data.length if not provided
//     mime: '', // optional mime type, will default to 'b2/x-auto' if not provided
//     data: 'data', // this is expecting a Buffer, not an encoded string
//     hash: 'sha1-hash', // optional data hash, will use sha1(data) if not provided
//     info: {
//         // optional info headers, prepended with X-Bz-Info- when sent, throws error if more than 10 keys set
//         // valid characters should be a-z, A-Z and '-', all other characters will cause an error to be thrown
//         key1: 'value'
//         key2: 'value'
//     },
//     onUploadProgress: (event) => {} || null // progress monitoring
//     // ...common arguments (optional)
//   });  // returns promise
// }



// B2_BUCKET_ID=7c79b1d5bf3484b063b40d1a
// B2_BUCKET_NAME=neverfapdeluxepaidresources



  // async function GetBucket() {
  //   try {
  //     await b2.authorize(); // must authorize first
  //     let response = await b2.getBucket({ bucketName: 'my-bucket' });
  //     console.log(response.data);
  //   } catch (err) {
  //     console.log('Error getting bucket:', err);
  //   }
  // }
  

module.exports = {
  stringFromArray,
  generatePage,
  generateContent,
  generatePageChildren,
};
