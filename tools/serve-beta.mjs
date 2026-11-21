import express from 'express';
import {installHomepage} from '../server/src/homepage.js';
const app=express();app.use(express.json({limit:'8kb'}));
app.use(express.static('deploy/beta/public'));
installHomepage(app);
app.get('/',(_,res)=>res.redirect('/homepage/'));
app.use((err,req,res,next)=>res.status(err.status||503).json({error:'요청을 처리하지 못했습니다. 입력 크기와 연결을 확인해 주세요.'}));
const port=Number(process.env.PORT||5176);app.listen(port,'127.0.0.1',()=>console.log(`Beta preview http://localhost:${port}/homepage/`));
