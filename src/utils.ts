import axios from 'axios';
import * as fs from 'fs';
import * as url from 'url';

export async function downloadImageAndSave(imageURL: string, filename: string): Promise<string> {
    const res = await axios.get(imageURL, { responseType: 'arraybuffer' });

    const parsedUrl = url.parse(imageURL);
    const extension = parsedUrl.pathname.split('.').pop();
    
	const filenameWithExtension = `${filename}.${extension}`;
    await fs.promises.writeFile(`./data/avatars/${filenameWithExtension}`, res.data);
    
    return filenameWithExtension;
}