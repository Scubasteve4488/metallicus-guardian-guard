var B="https://cdn.jsdelivr.net/gh/StudioGalt/Sign-Language-Mocap-Archive@main/SG ASL Fingerspelling/Letters/";
var RAW="https://raw.githubusercontent.com/StudioGalt/Sign-Language-Mocap-Archive/main/SG%20ASL%20Fingerspelling/Letters/";
var D={A:["SG ASL A 2024-6-16","Fist, thumb flat against the <b>side</b> of the index finger."],
B:["SG ASL B 2024-6-16","Four fingers up and <b>together</b>, thumb folded across the palm."],
C:["SG ASL C 1 2024-6-16","Whole hand curves into a <b>C</b>. Keep the gap."],
D:["SG ASL D 2 2024-6-16","Index up, other three meeting the <b>thumb</b> below."],
E:["SG ASL E 2 2024-6-16","Fingertips curled onto the thumb lying <b>across</b> underneath."],
F:["SG ASL F 2024-6-16","Thumb and <b>index</b> form a circle, other three up."],
G:["SG ASL G 2024-6-16","Index and thumb extended <b>sideways</b>, parallel."],
H:["SG ASL H 2024-6-16","Index and middle together, pointing <b>sideways</b>."],
I:["SG ASL I 2 2024-6-16","Only the <b>pinky</b> up."],
J:["SG ASL J 2 2024-6-16","Start at I, then <b>draw a J</b> with the pinky."],
K:["SG ASL K 1 2024-6-16","V shape, thumb coming up <b>between</b> the fingers."],
L:["SG ASL L 2024-6-16","Index up, thumb out &mdash; a <b>right angle</b>."],
M:["SG ASL M 2 2024-6-16","<b>Three</b> fingers over the tucked thumb."],
N:["SG ASL N 2 2024-6-16","<b>Two</b> fingers over the tucked thumb."],
O:["SG ASL O 2024-6-16","All fingertips meet the thumb in a round <b>O</b>."],
P:["SG ASL P2 2024-6-17","K turned to point <b>down</b>."],
Q:["SG ASL Q 2 2024-6-17","G turned to point <b>down</b>."],
R:["SG ASL R 3 2024-6-17","Index and middle up and <b>crossed</b>."],
S:["SG ASL S 2 2024-6-17","Fist, thumb <b>across the front</b>."],
T:["SG ASL T 2 2024-6-17","Thumb tucked <b>between</b> index and middle."],
U:["SG ASL U 2 2024-6-17","Index and middle up, <b>together</b>."],
V:["SG ASL V 2 2024-6-17","Index and middle up, <b>spread</b>."],
W:["SG ASL W 2 2024-6-17","<b>Three</b> fingers up and spread."],
X:["SG ASL X 1 2024-6-17","Index finger <b>hooked</b>."],
Y:["SG ASL Y 2024-6-17","Thumb and <b>pinky</b> out."],
Z:["SG ASL Z 2 2024-6-17","<b>Draw a Z</b> with the index finger."]};
var K=Object.keys(D),ix=0,speed=1,cache={},cur="A",streak=0;
var vid=document.getElementById('vid'),vmsg=document.getElementById('vmsg'),vmsgt=document.getElementById('vmsgt');
function ju(L){var n=D[L][0];return B+encodeURIComponent(n+" Upload")+"/Documentation/"+encodeURIComponent(n+" CC.mp4");}
function ru(L){var n=D[L][0];return RAW+encodeURIComponent(n+" Upload")+"/Documentation/"+encodeURIComponent(n+" CC.mp4");}
function setL(L){
 document.getElementById('ltr').textContent=L;
 document.getElementById('tgt2').textContent=L;
 document.getElementById('desc').innerHTML=D[L][1];
 cur=L;streak=0;
 var bs=document.getElementById('alpha').children;
 for(var i=0;i<bs.length;i++){var on=bs[i].textContent===L;
  bs[i].style.background=on?'linear-gradient(135deg,#00D1FF,#7C5CFF)':'var(--bg2)';
  bs[i].style.color=on?'#08090D':'var(--dim)';bs[i].style.borderColor=on?'transparent':'var(--line)';}
 if(cache[L]){vid.src=cache[L];vid.playbackRate=speed;vmsg.style.display='none';vid.play().catch(function(){});return;}
 vmsg.style.display='grid';vmsgt.textContent='Loading\u2026';
 vid.src=ju(L);vid.playbackRate=speed;vid.load();
}
vid.addEventListener('loadeddata',function(){vmsg.style.display='none';vid.playbackRate=speed;vid.play().catch(function(){});});
vid.addEventListener('error',function(){
 var L=document.getElementById('ltr').textContent;
 if(cache[L])return;
 vmsgt.textContent='Fetching\u2026';
 fetch(ru(L)).then(function(r){if(!r.ok)throw 0;return r.blob();})
  .then(function(b){var u=URL.createObjectURL(new Blob([b],{type:'video/mp4'}));cache[L]=u;
   if(document.getElementById('ltr').textContent!==L)return;
   vid.src=u;vid.playbackRate=speed;vmsg.style.display='none';vid.play().catch(function(){});})
  .catch(function(){vmsgt.innerHTML='Clip unavailable.<br><span style="font-size:11.5px;color:var(--faint)">Try another letter.</span>';});
});
var al=document.getElementById('alpha');
K.forEach(function(L,i){var b=document.createElement('button');b.className='lt';b.textContent=L;
 b.onclick=function(){ix=i;setL(L);};al.appendChild(b);});
document.getElementById('nx').onclick=function(){ix=(ix+1)%K.length;setL(K[ix]);};
Array.prototype.forEach.call(document.querySelectorAll('.spd'),function(b){
 b.onclick=function(){speed=parseFloat(b.getAttribute('data-s'));vid.playbackRate=speed;
 Array.prototype.forEach.call(document.querySelectorAll('.spd'),function(o){var on=o===b;
  o.style.background=on?'linear-gradient(135deg,#00D1FF,#7C5CFF)':'var(--bg2)';
  o.style.color=on?'#08090D':'var(--txt)';o.style.borderColor=on?'transparent':'var(--line)';});};});

var lm=null,onC=false,raf=null;
var cam=document.getElementById('cam'),ov=document.getElementById('ov'),ctx=ov.getContext('2d'),idle=document.getElementById('idle');
var T={A:"Closed fist, thumb along the side.",B:"Four fingers up together, thumb across.",C:"Curve the hand into a C.",D:"Index up, others meeting the thumb.",E:"Fingertips curled to the thumb.",F:"Index and thumb circle, three up.",I:"Pinky up, rest closed.",L:"Index up, thumb out, right angle.",O:"Fingertips meet thumb in a round O.",V:"Index and middle up, spread.",W:"Three fingers up and spread.",Y:"Thumb and pinky out."};
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function ex(p){var P=[[8,6],[12,10],[16,14],[20,18]],u=P.map(function(q){return p[q[0]].y<p[q[1]].y-0.02;});
 return{u:u,t:d(p[4],p[17])>d(p[3],p[17])*1.12,n:u.filter(function(z){return z;}).length};}
function sc(p){var e=ex(p),i=e.u[0],m=e.u[1],r=e.u[2],k=e.u[3],c=d(p[4],p[8])<0.06;
 switch(cur){case"A":return(!i&&!m&&!r&&!k)?(e.t?0.95:0.72):0.18;
 case"B":return(i&&m&&r&&k&&!e.t)?0.93:(e.n>=3?0.5:0.15);
 case"C":return(!c&&d(p[4],p[8])<0.16&&d(p[4],p[8])>0.06&&e.n<=1)?0.84:0.22;
 case"D":return(i&&!m&&!r&&!k&&c)?0.9:(i&&e.n===1?0.55:0.15);
 case"E":return(e.n===0&&!e.t&&d(p[8],p[5])<0.09)?0.86:0.2;
 case"F":return(c&&m&&r&&k)?0.94:(c?0.5:0.15);
 case"I":return(!i&&!m&&!r&&k)?0.93:0.16;
 case"L":return(i&&!m&&!r&&!k&&e.t)?0.93:(i&&e.n===1?0.52:0.15);
 case"O":return(e.n===0&&d(p[4],p[8])<0.075&&d(p[4],p[8])>0.015)?0.87:0.2;
 case"V":return(i&&m&&!r&&!k&&d(p[8],p[12])>0.07)?0.93:(i&&m?0.55:0.15);
 case"W":return(i&&m&&r&&!k)?0.92:(e.n===3?0.5:0.15);
 case"Y":return(!i&&!m&&!r&&k&&e.t)?0.93:0.18;default:return 0.45;}}
function dr(p){var C=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
 ov.width=cam.videoWidth||640;ov.height=cam.videoHeight||480;ctx.clearRect(0,0,ov.width,ov.height);
 ctx.strokeStyle='rgba(124,92,255,.85)';ctx.lineWidth=3;
 C.forEach(function(q){ctx.beginPath();ctx.moveTo(p[q[0]].x*ov.width,p[q[0]].y*ov.height);
  ctx.lineTo(p[q[1]].x*ov.width,p[q[1]].y*ov.height);ctx.stroke();});
 ctx.fillStyle='#00D1FF';p.forEach(function(q){ctx.beginPath();ctx.arc(q.x*ov.width,q.y*ov.height,4,0,7);ctx.fill();});}
function vr(s){var v=document.getElementById('vd'),h=document.getElementById('hn'),f=document.getElementById('fl'),pc=document.getElementById('pc');
 f.style.width=Math.round(s*100)+'%';pc.textContent=Math.round(s*100)+'%';
 if(s>0.8){f.style.background='#25D07A';v.style.color='#25D07A';v.textContent="That's "+cur+". Hold it\u2026";streak++;
  if(streak>28){h.textContent='Got it.';streak=0;setTimeout(function(){ix=(ix+1)%K.length;setL(K[ix]);},450);}}
 else if(s>0.45){f.style.background='#FFB020';v.style.color='#FFB020';v.textContent='Close \u2014 adjust';h.textContent=T[cur]||'';streak=0;}
 else{f.style.background='#FF4D6A';v.style.color='#FF4D6A';v.textContent='Not '+cur+' yet';h.textContent=T[cur]||'';streak=0;}}
function lp(){if(!onC)return;
 if(lm&&cam.readyState>=2){var r=lm.detectForVideo(cam,performance.now());
  if(r.landmarks&&r.landmarks.length){dr(r.landmarks[0]);vr(sc(r.landmarks[0]));}
  else{ctx.clearRect(0,0,ov.width,ov.height);document.getElementById('vd').textContent='No hand detected';
   document.getElementById('vd').style.color='var(--dim)';document.getElementById('fl').style.width='0%';
   document.getElementById('pc').textContent='0%';streak=0;}}
 raf=requestAnimationFrame(lp);}
document.getElementById('go').onclick=function(){
 var b=document.getElementById('go'),st=document.getElementById('stat');
 if(onC){onC=false;cancelAnimationFrame(raf);
  if(cam.srcObject){cam.srcObject.getTracks().forEach(function(t){t.stop();});}
  cam.srcObject=null;idle.style.display='grid';b.innerHTML='&#9654; Start camera';st.textContent='Stopped';
  ctx.clearRect(0,0,ov.width,ov.height);return;}
 st.textContent='Loading\u2026';b.textContent='Loading\u2026';
 import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14").then(function(V){
  if(lm)return null;
  return V.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm")
  .then(function(f){return V.HandLandmarker.createFromOptions(f,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"},runningMode:"VIDEO",numHands:1});})
  .then(function(x){lm=x;});})
 .then(function(){st.textContent='Camera\u2026';return navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}});})
 .then(function(s){cam.srcObject=s;return cam.play();})
 .then(function(){onC=true;idle.style.display='none';b.innerHTML='&#9632; Stop';st.textContent='Tracking';lp();})
 .catch(function(){st.textContent='Unavailable';b.innerHTML='&#9654; Start camera';
  document.getElementById('vd').textContent='Camera unavailable';document.getElementById('vd').style.color='#FF4D6A';
  document.getElementById('hn').textContent='Allow camera access when your browser asks. Nothing is uploaded.';});};
setL("A");
