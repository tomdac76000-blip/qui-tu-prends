import {readFileSync} from 'node:fs';
const assets=new Map();
for(const file of JSON.parse(readFileSync(new URL('./quiz-media-index.json',import.meta.url))))for(const[id,a]of Object.entries(JSON.parse(readFileSync(new URL(file,import.meta.url)))))assets.set(id,{mime:a.mime,bytes:Buffer.from(a.data,'base64')});
export function installQuizMedia(app){app.get('/quiz-media/:id',(req,res)=>{const a=assets.get(req.params.id);if(!a)return res.sendStatus(404);res.set({'Content-Type':a.mime,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});res.send(a.bytes);});}
