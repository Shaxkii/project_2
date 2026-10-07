// Three.js는 3D 화면을, 아래 JavaScript는 게임 규칙과 충돌을 담당합니다.
import * as THREE from './vendor/three.module.js';
const $ = id => document.getElementById(id);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07111c);
scene.fog = new THREE.Fog(0x07111c, 26, 65);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 22, 20); camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb3eaff,0x233044,2));
const sun=new THREE.DirectionalLight(0xffffff,3); sun.position.set(3,15,8); sun.castShadow=true; scene.add(sun);
const world = new THREE.Group(); scene.add(world);
function mesh(geometry,color,x,y,z,emissive=false){
 const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.2,emissive:emissive?color:0,emissiveIntensity:.6}));
 m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; world.add(m); return m;
}
const box=(w,h,d,c,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z);
box(22,.4,15,0x152c3c,0,-.3,0);
const grid=new THREE.GridHelper(22,22,0x376372,0x214454); grid.position.y=-.08; grid.scale.z=15/22; world.add(grid);
box(22,.5,.25,0x3a6672,0,.1,-7.5); box(22,.5,.25,0x3a6672,0,.1,7.5);
box(.25,.5,15,0x3a6672,-11,.1,0); box(.25,.5,15,0x3a6672,11,.1,0);
const player=new THREE.Group(); world.add(player);
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.42,4,8),new THREE.MeshStandardMaterial({color:0x8ffff0,emissive:0x2c8879,emissiveIntensity:.5})); body.position.y=.65; body.castShadow=true; player.add(body);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,8,32),new THREE.MeshBasicMaterial({color:0x8ffff0})); ring.rotation.x=Math.PI/2; ring.position.y=.02; player.add(ring);
const exit=box(1.2,.12,2,0x36505d,9.8,0,0);
const arch=box(.18,2.5,2,0x648086,10.5,1.2,0);
const rules=[
 {name:'정상 시간',hint:'움직일 때만 탄막이 움직여요.',speed:1,reverse:false,ice:false},
 {name:'거울 조작',hint:'방향키가 반대로 작동해요!',speed:1,reverse:true,ice:false},
 {name:'시간 과속',hint:'탄막이 1.6배 빨라져요. 짧게 움직이세요.',speed:1.6,reverse:false,ice:false},
 {name:'얼음 시간',hint:'관성 때문에 미끄러져요. 반대 방향으로 제동하세요.',speed:1,reverse:false,ice:true},
 {name:'느린 발걸음',hint:'이동 속도가 느려져요. 경로를 신중히 고르세요.',speed:1,reverse:false,ice:false,slow:true}
];
let active=false,paused=false,ended=false,room=1,hp=3,score=0,collected=0,simTime=0,invincible=0,rule=rules[0],spawn=0,runTime=0;
let bullets=[],gems=[],obstacles=[],vx=0,vz=0,order=[]; const keys=new Set();
const layouts=[[[0,-2.3],[3,3]], [[-2,2.4],[3,-2.6]], [[0,0],[5,3.7]], [[-3,-3],[3,2.7]], [[-1,2],[4,-2]]];
function remove(m){world.remove(m);m.geometry?.dispose();m.material?.dispose();}
function hud(){ $('room').textContent=`ROOM ${String(room).padStart(2,'0')} / 05`; $('health').textContent='♥ '.repeat(hp)+'♡ '.repeat(3-hp); $('gems').textContent=`시간 조각 ${collected} / 3`; $('score').textContent=`점수 ${score}`; }
function loadRoom(){
 [...bullets.map(b=>b.m),...gems,...obstacles].forEach(remove);bullets=[];gems=[];obstacles=[];
 rule=room===1?rules[0]:rules[order[room-2]]; collected=0;spawn=0;simTime=0;invincible=0;vx=vz=0;keys.clear();player.position.set(-9,0,0);player.visible=true;
 layouts[room-1].forEach(([x,z])=>obstacles.push(box(1.3,1.2,2,0xa34570,x,.6,z)));
 [[-5,-4.5],[0,4.8],[6,-4.4]].forEach(([x,z])=>gems.push(mesh(new THREE.OctahedronGeometry(.48),0xffd889,x,.7,z,true)));
 exit.material.color.set(0x36505d);arch.material.color.set(0x648086);
 $('rule').textContent=`${rule.name} · ${rule.hint}`;$('notice').textContent='조각 3개를 모아 오른쪽 출구로!';hud();
}
function restart(){room=1;hp=3;score=0;runTime=0;ended=false;paused=false;active=true;order=[1,2,3,4];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}loadRoom();$('overlay').style.display='none';}
function overlay(title,description,label){$('title').textContent=title;$('description').textContent=description;$('start').textContent=label;$('overlay').style.display='grid';}
$('start').onclick=()=>{if(paused){paused=false;keys.clear();$('overlay').style.display='none';}else restart();};
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='KeyR')restart();if(e.code==='KeyP'&&active&&!ended){paused=!paused;keys.clear();if(paused)overlay('잠시 멈춤','P 또는 계속하기로 다시 시작할 수 있어요.','계속하기');else $('overlay').style.display='none';}});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(active&&!ended&&!paused){paused=true;overlay('잠시 멈춤','창을 벗어나 게임을 일시 정지했어요.','계속하기');}});
function hurt(){if(invincible>0)return;hp--;invincible=1.2;hud();if(hp<=0){ended=true;active=false;overlay('시간에 붙잡혔어요.',`${room}번 방에서 종료 · 점수 ${score}. 멈춰서 탄막의 경로를 살펴보세요!`,'다시 도전');}}
function spawnBullet(){
 const side=Math.floor(Math.random()*4);let x,z;
 if(side<2){x=side===0?-10.5:10.5;z=Math.random()*13-6.5;}else{x=Math.random()*20-10;z=side===2?-7:7;}
 const dir=new THREE.Vector2(player.position.x-x,player.position.z-z).normalize();
 const m=mesh(new THREE.SphereGeometry(.2,10,8),0xff795a,x,.45,z,true);
 bullets.push({m,x:dir.x,z:dir.y});
}
function update(dt){
 if(!active||paused||ended)return;
 let dx=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
 let dz=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
 const len=Math.hypot(dx,dz);if(len){dx/=len;dz/=len;}if(rule.reverse){dx=-dx;dz=-dz;}
 const speed=(rule.slow?3:5)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?.45:1);
 if(rule.ice){const blend=1-Math.exp(-4*dt);vx+=(dx*speed-vx)*blend;vz+=(dz*speed-vz)*blend;if(!len&&Math.hypot(vx,vz)<.03)vx=vz=0;}else{vx=dx*speed;vz=dz*speed;}
 const oldX=player.position.x,oldZ=player.position.z;
 player.position.x=THREE.MathUtils.clamp(oldX+vx*dt,-10.3,10.3); player.position.z=THREE.MathUtils.clamp(oldZ+vz*dt,-6.8,6.8);
 // 장애물과 닿으면 진입을 막고 체력을 줄입니다.
 for(const o of obstacles){if(Math.abs(player.position.x-o.position.x)<1&&Math.abs(player.position.z-o.position.z)<1.35){player.position.x=oldX;player.position.z=oldZ;vx=vz=0;hurt();break;}}
 if(!active)return;
 const moving=Math.hypot(player.position.x-oldX,player.position.z-oldZ)>.0001;
 $('time').textContent=moving?'▶ TIME FLOWING':'Ⅱ TIME FROZEN';$('time').style.color=moving?'#ffd889':'#85fff0';
 // 현실 프레임 시간과 게임 시간을 분리하여 정지 중 탄막/타이머가 진행되지 않게 합니다.
 const worldDt=moving?dt*rule.speed:0;simTime+=worldDt;runTime+=moving?dt:0;invincible=Math.max(0,invincible-dt);
 player.visible=invincible<=0||Math.floor(invincible*12)%2===0;
 if(moving){spawn-=worldDt;if(spawn<=0){spawnBullet();spawn=Math.max(.42,1.25-room*.13);}}
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.m.position.x+=b.x*3.2*worldDt;b.m.position.z+=b.z*3.2*worldDt;
 if(Math.hypot(b.m.position.x-player.position.x,b.m.position.z-player.position.z)<.53){hurt();remove(b.m);bullets.splice(i,1);}else if(Math.abs(b.m.position.x)>12||Math.abs(b.m.position.z)>9){remove(b.m);bullets.splice(i,1);}}
 for(let i=gems.length-1;i>=0;i--){const g=gems[i];g.rotation.y=simTime;g.position.y=.7+Math.sin(simTime*2+i)*.1;
 if(player.position.distanceTo(new THREE.Vector3(g.position.x,0,g.position.z))<.8){remove(g);gems.splice(i,1);collected++;score+=100;hud();}}
 if(collected===3){exit.material.color.set(0x85fff0);arch.material.color.set(0x85fff0);$('notice').textContent='출구 개방! 오른쪽 초록색 문으로 이동하세요.';
 if(active&&player.position.x>9&&Math.abs(player.position.z)<1.2){score+=200;hud();if(room===5){active=false;ended=true;overlay('시간을 훔쳤어요!',`5개 방 탈출 성공! 점수 ${score} · 움직인 시간 ${runTime.toFixed(1)}초`,'다시 플레이');}else{room++;loadRoom();}}}
}
let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;update(dt);renderer.render(scene,camera);}loadRoom();requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
