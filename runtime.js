const os = require('os');
const http = require('http');
const axios = require('axios')
const pty = require('node-pty');
const utils = require('os-utils');
const express = require('express');
const bodyParser = require('body-parser');


const PORT = 5000
const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const io = require('socket.io')(server);

function getCPUUsage(){
    let usage;
    utils.cpuUsage(value=>usage=`CPU Usage: ${(value*100).toFixed(2)}%`);
    return usage;
}

io.sockets.on("connection",client=>{
    console.log(`Websocket connected to client.${new Date().toString()}`);
    ptyProcess = pty.spawn('bash',[],{
        name:'xterm-color',
        cols:80,
        rows:30,
        cwd:process.env.HOME,
        env:process.env
    });
    ptyProcess.on('data',data=>{
        client.emit('send-output',data);
    })
    client.on('test-sketch-socket',(data)=>{ //saves notebook
        console.log(data);
        axios.post("http://localhost:5200/replicateNotebook",data).then(({data})=>{
            console.log(data)
        })
    })
    client.on('run-command',command=>{
        console.log(`Server received command: ${command}`);
        ptyProcess.write(`${command}\r`)
    })
    client.on('get-health',(data)=>{
        console.log(`Client URL: ${data}`);
        setInterval(()=>{
            let usage;
            utils.cpuUsage(value=>{
                usage=`CPU Usage: ${(value*100).toFixed(2)}%`;
                const ut = os.uptime();
                const data = {
                    uptime:`${ut} second(s) [ ${parseInt((ut/60)/60)} hour(s) and ${parseInt((((ut/60)/60).toFixed(2)-parseInt((ut/60)/60))*59)} minute(s) ⏳ ]`,
                    operatingSystem:os.type()+' | '+os.release()+' | '+os.platform()+' | '+os.arch(),
                    memoryUsedPercent:(((os.totalmem()-os.freemem())/os.totalmem())*100).toFixed(1)+'%',
                    cpuUsage :usage
                };
                client.emit('send-health',data);
            });
        },1000);
    })
})


app.get("/testAPI",(req,res)=>{
    res.send({
        message:"REST API functionality is working."
    })
})

app.post("/runTile",(req,res)=>{ //convert this to a post request that takes in notebookName and tileName
    // axios.get("http://localhost:5200/checkOnline")
    // .then(({data}) => {
    //     if (data.message===1){
    //         axios.post("http://localhost:5200/runTile",{notebookName:"nb1",tileName:"tile3"})
    //         .then(({data})=>res.send(data))
    //     }
    //     else{
    //         res.json({message:"Python code execution engine is offline."})
    //     }
    // }) HEY MAN, FIX THIS CODE
    const {notebookName,tileName} = req.body;
    axios.post("http://localhost:5200/runTile",{notebookName:notebookName,tileName:tileName}).then(({data})=>{
        // console.log(data)
        res.json(data)
    })
}) //convert this into a websocket response tied to the server.

server.listen(PORT,()=>`Websocket server listening on port: ${PORT}`);
console.log(`Websocket server listening on port: ${PORT}`)
