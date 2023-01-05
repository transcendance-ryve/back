import axios from 'axios';
import * as fs from 'fs';
import * as url from 'url';

export async function generateRandomFilenameWithExtension(extension: string): Promise<string> {
	const randomFilename = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	return `${randomFilename}.${extension}`;
}

export async function downloadImageAndSave(imageURL: string): Promise<string> {
    const res = await axios.get(imageURL, { responseType: 'arraybuffer' });

    const parsedUrl = url.parse(imageURL);
    const extension = parsedUrl.pathname.split('.').pop();
    
	const randomName = Array(32)
		.fill(null)
		.map(() => Math.round(Math.random() * 16).toString(16))
		.join('');

	const filenameWithExtension = `${randomName}.${extension}`;
    await fs.promises.writeFile(`./data/avatars/${filenameWithExtension}`, res.data);
    
    return filenameWithExtension;
}