import axios from 'axios';
import * as fs from 'fs';
import * as url from 'url';

export async function downloadImageAndSave(imageURL: string): Promise<string> {
    const res = await axios.get(imageURL, { responseType: 'arraybuffer' });

    const parsedUrl = url.parse(imageURL);
    const extension = parsedUrl.pathname.split('.').pop();
    const randomFilename = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('')
    
    const filename = `${randomFilename}.${extension}`
    await fs.promises.writeFile(`./data/avatars/${filename}`, res.data);
    
    return filename;
}