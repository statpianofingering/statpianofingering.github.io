// console.log(1>3);
//console.log(i+' '+fileContent[i].split(/\s+/));

var files;
var fin=[];
var diff=[];//diff[n][0,1,2]=RH,LH,BH
var edits=[];
var fingeringsGT=[];
var fingeringsEST1=[];
var fingeringsEST2=[];
var drawmode=0;
var mode=0;//0:fingering, 1:ID
var selectedInput = null;
var handSepModel=new HandSepModel();
var model=new FHMM1();

var width;
var xoffset=100;
var yoffset=0;//=120 if difficulty is on
var heightC4=200;
var pxPerSec=200;
var legerWidth=0.5;
var heightUnit=10;
var maxTime=2.1;

window.onload = function(){
	Draw();
}//end onload

function ReadFile(file,addmode=1){
	var reader = new FileReader();

	if(file.name.indexOf('.mid')>=0){//MIDI file

	var reader = new FileReader();
	reader.readAsArrayBuffer(file);

		reader.onload = function(){
			midi=new Midi();
			pr=new PianoRoll();
			var fileContent=new Uint8Array(reader.result);
			var ch=[];
			var pos=0;
			midi.evts=[];
			//Read header
			ch=fileContent.slice(pos,pos+4); pos+=4;
			if(!(ch[0]==77&&ch[1]==84&&ch[2]==104&&ch[3]==100)){console.log('Error: file does not start with MThd');return;}//endif
			ch=fileContent.slice(pos,pos+4); pos+=4;// track length=6
			ch=fileContent.slice(pos,pos+2); pos+=2;//format number==0 or 1
			midi.formatType=ch[1];
//console.log('formatType : '+midi.formatType);
			if(midi.formatType!=0 && midi.formatType!=1){console.log('Error: format type is not 0 nor 1');return;}
			ch=fileContent.slice(pos,pos+2); pos+=2;//number of track
			midi.nTrack=ch[1];
//console.log('Number of tracks : '+midi.nTrack);
			if(midi.nTrack<1){console.log('Error: track number less than 1');return;}
			ch=fileContent.slice(pos,pos+2); pos+=2;//tick per quater tone
			midi.TPQN=ch[0]*16*16+ch[1];
//console.log('TPQN : '+midi.TPQN);

			//Read track data
			var runningStatus;
			for(var i=0;i<midi.nTrack;i+=1){
				ch=fileContent.slice(pos,pos+4); pos+=4;//
				if(!(ch[0]==77&&ch[1]==84&&ch[2]==114&&ch[3]==107)){console.log('Error: track does not start with MTrk');return;}//endif
				ch=fileContent.slice(pos,pos+4); pos+=4;// track length
				var trk_len=ch[3]+16*16*(ch[2]+16*16*(ch[1]+16*16*ch[0]));
				ch=fileContent.slice(pos,pos+trk_len); pos+=trk_len;// track data
//console.log(trk_len);

				var curByte=0;
				var tick=0;//cumulative tick
				var deltaTick=0;
				var readTick=true;
				while(curByte<trk_len){
	
					var midiMes = new MidiMessage();
					midiMes.track=i;
					var vi=[];//vector<int>
	
					if(readTick){
						deltaTick=0;
						while(true){
							if(ch[curByte]<128){break;}
							deltaTick=128*deltaTick+(ch[curByte]-128);
							curByte+=1;
						}//endwhile
						deltaTick=128*deltaTick+ch[curByte];
						tick+=deltaTick;
						readTick=false; curByte+=1; continue;
					}//endif
	
					var vi=[];
					if((ch[curByte]>=128 && ch[curByte]<192) || (ch[curByte]>=224 && ch[curByte]<240)){
						runningStatus=ch[curByte];
						vi.push( ch[curByte] ); vi.push( ch[curByte+1] ); vi.push( ch[curByte+2] );
						curByte+=3;
					}else if(ch[curByte]>=192&&ch[curByte]<224){
						runningStatus=ch[curByte];
						vi.push( ch[curByte] ); vi.push( ch[curByte+1] );
						curByte+=2;
					}else if(ch[curByte]==240 || ch[curByte]==255){
						runningStatus=ch[curByte];
						vi.push( ch[curByte] );
						curByte+=1;
						if(runningStatus==255){
							vi.push( ch[curByte] );//type of metaevent
							curByte+=1;
						}//endif
						var numBytes=0;
						while(true){
							if(ch[curByte]<128) break;
							numBytes=128*numBytes+(ch[curByte]-128);
							vi.push( ch[curByte] );
							curByte+=1;
						}//endwhile
						numBytes=128*numBytes+ch[curByte];
						vi.push( ch[curByte] );
						for(var j=0;j<numBytes;j+=1){vi.push( ch[curByte+1+j] );}
						curByte+=1+numBytes;
					}else if(ch[curByte]<128){
						if((runningStatus>=128 && runningStatus<192) || (runningStatus>=224 && runningStatus<240)){
							vi.push( runningStatus ); vi.push( ch[curByte] ); vi.push( ch[curByte+1] );
							curByte+=2;
						}else if(runningStatus>=192 && runningStatus<224){
							vi.push( runningStatus ); vi.push( ch[curByte] );
							curByte+=1;
						}else if(runningStatus==240 || runningStatus==255){
							vi.push( runningStatus );
							if(runningStatus==255){curByte+=1; vi.push( ch[curByte] );}
							curByte+=1;
							var numBytes=0;
							while(true){
								if(ch[curByte]<128) break;
								numBytes=128*numBytes+(ch[curByte]-128);
								vi.push( ch[curByte] );
								curByte+=1;
							}//endwhile
							numBytes=128*numBytes+ch[curByte];
							vi.push( ch[curByte] );
							for(var j=0;j<numBytes;j+=1){vi.push( ch[curByte+1+j] );}
							curByte+=1+numBytes;
						}else{
							console.log('Error: runningStatus has an invalid value : '+runningStatus); return; break;
						}//endif
					}else{
						console.log('Error: unknown events in the trk : '+i+' '+curByte+' '+ch[curByte]); return; break;
					}//endif
	
					midiMes.tick=tick;
					midiMes.mes=vi;
 					midi.evts.push(midiMes);
					readTick=true;	
				}//endwhile

			}//endfor i

			midi.evts.sort(LessTickMidiMessage);

			// set times
			var tickPoint=0;
			var timePoint=0;
			var currDurQN=500000;
			for(var i=0,len=midi.evts.length;i<len;i+=1){
				midi.evts[i].time=timePoint+(1.*(midi.evts[i].tick-tickPoint)/(1.*midi.TPQN))*(currDurQN/1000000.);
// 				midi.evts[i].time=timePoint+((double)(midi.evts[i].tick-tickPoint)/(double)TPQN)*((double)currDurQN/1000000.);
				if(midi.evts[i].mes[0]==255 && midi.evts[i].mes[1]==81 && midi.evts[i].mes[2]==3){
					currDurQN=midi.evts[i].mes[3]*256*256+midi.evts[i].mes[4]*256+midi.evts[i].mes[5];
					timePoint=midi.evts[i].time;
					tickPoint=midi.evts[i].tick;
				}//endif
			}//endfor i

console.log(midi.evts.length);

			var onPosition=[];
			for(var i=0;i<16;i+=1){onPosition[i]=[];for(var j=0;j<128;j+=1){onPosition[i][j]=-1;}}//endfor i,j
			var evt=new PianoRollEvt();
			var curChan;

			for(var n=0,len=midi.evts.length;n<len;n+=1){
	
				if(midi.evts[n].mes[0]>=128 && midi.evts[n].mes[0]<160){//note-on or note-off event
					curChan=midi.evts[n].mes[0]%16;
					if(midi.evts[n].mes[0]>=144 && midi.evts[n].mes[2]>0){//note-on
						if(onPosition[curChan][midi.evts[n].mes[1]]>=0){
							console.log('Warning: (Double) note-on event before a note-off event '+PitchToSitch(midi.evts[n].mes[1]));
							pr.evts[onPosition[curChan][midi.evts[n].mes[1]]].offtime=midi.evts[n].time;
							pr.evts[onPosition[curChan][midi.evts[n].mes[1]]].offvel=-1;
						}//endif
						onPosition[curChan][midi.evts[n].mes[1]]=pr.evts.length;
						evt.channel=curChan;
						evt.sitch=PitchToSitch(midi.evts[n].mes[1]);
						evt.pitch=midi.evts[n].mes[1];
						evt.onvel=midi.evts[n].mes[2];
						evt.offvel=0;
						evt.ontime=midi.evts[n].time;
						evt.offtime=evt.ontime+0.1;
						var evt_=JSON.stringify(evt);
						evt_=JSON.parse(evt_);
						pr.evts.push(evt_);
					}else{//note-off
						if(onPosition[curChan][midi.evts[n].mes[1]]<0){
							console.log('Warning: Note-off event before a note-on event '+PitchToSitch(midi.evts[n].mes[1])+"\t"+midi.evts[n].time);
							continue;
						}//endif
						pr.evts[onPosition[curChan][midi.evts[n].mes[1]]].offtime=midi.evts[n].time;
						if(midi.evts[n].mes[2]>0){
							pr.evts[onPosition[curChan][midi.evts[n].mes[1]]].offvel=midi.evts[n].mes[2];
						}else{
							pr.evts[onPosition[curChan][midi.evts[n].mes[1]]].offvel=80;
						}//endif
						onPosition[curChan][midi.evts[n].mes[1]]=-1;
					}//endif
				}//endif
			}//endfor n
	
			for(var i=0;i<16;i+=1)for(var j=0;j<128;j+=1){
				if(onPosition[i][j]>=0){
					console.log('Error: Note without a note-off event');
					console.log('ontime channel sitch : '+pr.evts[onPosition[i][j]].ontime+"\t"+pr.evts[onPosition[i][j]].channel+"\t"+pr.evts[onPosition[i][j]].sitch);
					return;
				}//endif
			}//endfor i,j
	
			for(var n=0,len=pr.evts.length;n<len;n+=1){
				pr.evts[n].ID=n;
			}//endfor n

			fin=[];
			for(var n=0,len=pr.evts.length;n<len;n+=1){
				var finEvt=new FingeringEvt();
				finEvt.FromPrEvt(pr.evts[n]);
				fin.push(finEvt);
			}//endfor n

			if(fin.length==0){return;}

			if(fin[fin.length-1].offtime+3>maxTime){maxTime=fin[fin.length-1].offtime+3;}

			edits=[];
			document.getElementById('freetext').value='';

			ClearDifficulty();
			Draw();

		}//end reader.onload

	}else if(file.name.indexOf('ipr')>=0){//Ipr file

		reader.readAsText(file);
		reader.onload = function(e){
	
			fin=[];
			var fileContent=reader.result.split(/\n/);
			for(var i=0,len=fileContent.length;i<len;i+=1){
				if(fileContent[i]==""){continue;}
				if(fileContent[i][0]=='/' || fileContent[i][0]=='#'){continue;}
				var finEvt=new FingeringEvt();
				finEvt.FromIprFileEvt(fileContent[i].split(/\s+/));
				fin.push(finEvt);
			}//endfor i

			if(fin.length==0){return;}

			if(fin[fin.length-1].offtime+3>maxTime){maxTime=fin[fin.length-1].offtime+3;}

			edits=[];
			document.getElementById('freetext').value='';

			ClearDifficulty();
			Draw();
	
		}//end reader.onload

	}else{//not MIDI file

		reader.readAsText(file);
		reader.onload = function(e){
	
			fin=[];
			var fileContent=reader.result.split(/\n/);
			for(var i=0,len=fileContent.length;i<len;i+=1){
				if(fileContent[i]==""){continue;}
				if(fileContent[i][0]=='/' || fileContent[i][0]=='#'){continue;}
				var finEvt=new FingeringEvt();
				finEvt.FromFileEvt(fileContent[i].split(/\s+/));
				fin.push(finEvt);
			}//endfor i

			if(fin.length==0){return;}

			if(fin[fin.length-1].offtime+3>maxTime){maxTime=fin[fin.length-1].offtime+3;}

			edits=[];
			document.getElementById('freetext').value='';

			ClearDifficulty();
			Draw();
	
		}//end reader.onload

	}//endif


}//end ReadFile


function Draw(){

	drawmode=0;
	var modeRadio=document.getElementsByName("modeRadio");
	if(modeRadio[1].checked){drawmode=1;}

//console.log(document.getElementById("timeScale").value);
//	pxPerSec=document.getElementById("timeScale").value*200;

	document.getElementById('display').style.width=(window.innerWidth-50)+'px';

if(drawmode==0){

	document.getElementById('display').style.height=String(400+yoffset)+'px';

	//Draw staffs
	width=xoffset+maxTime*pxPerSec;
	document.getElementById('display').innerHTML='<svg id="mysvg" xmlns="http://www.w3.org/2000/svg" width="'+(width+20)+'" height="400"></svg>';
//	document.getElementById('display').style.width=(width+20)+'px';
	mysvg=document.getElementById('mysvg');
	for(var i=-5;i<=5;i+=1){
		if(i==0){continue;}
		var line1=document.createElementNS('http://www.w3.org/2000/svg','line');
		line1.setAttribute('x1',0);
		line1.setAttribute('x2',width);
		line1.setAttribute('y1',heightC4+10*i);
		line1.setAttribute('y2',heightC4+10*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(120,120,120)');
		line1.setAttribute('stroke-width',1);
		mysvg.appendChild(line1);
	}//endfor i

	var str='';

	//Draw time lines
	for(var t=0;t<maxTime;t+=1){
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-legerWidth)+'px; top:'+(heightC4-5*heightUnit-legerWidth)+'px; width:'+0+'px; height:'+10*heightUnit+'px; border:'+legerWidth+'px solid rgba(30,30,30,0.3);"></div>';
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-4)+'px; top:'+(heightC4-5*heightUnit-legerWidth-20)+'px; width:'+0+'px; height:'+10*heightUnit+'px; color:rgba(30,30,30,0.3); font-size:8pt">'+t+'</div>';
	}//endfor t
	str+='<img src="img/Gclef.png" height="'+(7.5*heightUnit)+'" style="position:absolute; left:'+(20)+'px; top:'+(heightC4-6.5*heightUnit)+'px;"/>';
	str+='<img src="img/Fclef.png" height="'+(3.4*heightUnit)+'" style="position:absolute; left:'+(20+3)+'px; top:'+(heightC4+0.9*heightUnit)+'px;"/>';

	//Draw notes
	for(var ichan=0;ichan<2;ichan+=1){
		for(var i=0,len=fin.length;i<len;i+=1){
			if(fin[i].channel!=ichan){continue;}
			var finEvt=fin[i];
			var sitchHeight=SitchToSitchHeight(finEvt.sitch);
	
			//Leger line
			if(sitchHeight==0){
				str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-8)+'px; top:'+(heightC4-legerWidth)+'px; width:'+16+'px; height:0px; border:'+legerWidth+'px solid rgba(0,0,0,1);"></div>';
			}else if(sitchHeight>11){
				for(let h=12,end=sitchHeight;h<=end;h+=2){
					str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-8)+'px;  top:'+(heightC4-0.5*heightUnit*h-legerWidth)+'px;width:'+16+'px; height:0px; border:0.5px solid rgba(0,0,0,1);"></div>';
				}//endfor h
			}else if(sitchHeight<-11){
				for(let h=-12,end=sitchHeight;h>=end;h-=2){
					str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-8)+'px; top:'+(heightC4-0.5*heightUnit*h-legerWidth)+'px; width:'+16+'px; height:0px; border:0.5px solid rgba(0,0,0,1);"></div>';
				}//endfor h
			}//endif
	
			//Note box
				str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-1)+'px; top:'+(-(1+sitchHeight)*5+heightC4-0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; border:1px solid rgba(20,20,20,0.7);"></div>';
			if(mode==0){
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:red; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:blue; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}//endif
			}else{
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}//endif
			}//endif

			//Accidental
			var acc=SitchToAcc(finEvt.sitch);
			if(acc==1){
				str+='<img src="img/Sharp.png" height="'+(2*heightUnit)+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-9)+'px; top:'+(-(1+sitchHeight)*5+heightC4-1-0.4*heightUnit)+'px;"/>';
			}else if(acc==2){
				str+='<img src="img/DoubleSharp.png" height="'+(heightUnit)+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-12)+'px; top:'+(-(1+sitchHeight)*5+heightC4-1+0.1*heightUnit)+'px;"/>';
			}else if(acc==-1){
				str+='<img src="img/Flat.png" height="'+(1.7*heightUnit)+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-9)+'px; top:'+(-(1+sitchHeight)*5+heightC4-0.5-0.6*heightUnit)+'px;"/>';
			}else if(acc==-2){
				str+='<img src="img/DoubleFlat.png" height="'+(1.7*heightUnit)+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-14)+'px; top:'+(-(1+sitchHeight)*5+heightC4-1-0.6*heightUnit)+'px;"/>';
			}//endif
		}//endfor i
	}//endfor ichan

	document.getElementById('display').innerHTML+=str;

}else{//drawmode==1

	document.getElementById('display').style.height='550px';
	var width=xoffset+maxTime*pxPerSec;
	var height=1050;
	document.getElementById('display').innerHTML='<svg id="mysvg" xmlns="http://www.w3.org/2000/svg" width="'+(width+20)+'" height="'+height+'"></svg>';

	//Draw frame C0(12)-C8(108)
	mysvg=document.getElementById('mysvg');
	for(var i=12;i<=108;i+=12){
		var line1=document.createElementNS('http://www.w3.org/2000/svg','line');
		line1.setAttribute('x1',15);
		line1.setAttribute('x2',15+width);
		line1.setAttribute('y1',-70+10*i);
		line1.setAttribute('y2',-70+10*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(0,0,0)');
		line1.setAttribute('stroke-width',1.3);
		mysvg.appendChild(line1);
	}//endfor i
	for(var i=19;i<=108;i+=12){
		var line1=document.createElementNS('http://www.w3.org/2000/svg','line');
		line1.setAttribute('x1',15);
		line1.setAttribute('x2',15+width);
		line1.setAttribute('y1',-70+10*i);
		line1.setAttribute('y2',-70+10*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(0,0,0)');
		line1.setAttribute('stroke-width',1);
		mysvg.appendChild(line1);
	}//endfor i

	var str='';
	for(var i=0;i<=8;i+=1){
		if(i==4){
			str+='<div style="position:absolute; left:'+2+'px; top:'+(1000-10*12*i)+'px; width:'+0+'px; height:'+10+'px; color:rgba(255,30,120,1); font-size:7pt">C'+i+'</div>';
		}else{
			str+='<div style="position:absolute; left:'+2+'px; top:'+(1000-10*12*i)+'px; width:'+0+'px; height:'+10+'px; color:rgba(0,0,0,1); font-size:7pt">C'+i+'</div>';
		}//endif
		if(i==8){continue;}
		//white keys
		var bc='rgba(255,255,255,1)';
		if(i==0 || i==1){bc='rgba(0,0,255,0.1)';
		}else if(i==2 || i==3){bc='rgba(0,153,73,0.1)';
		}else if(i==5 || i==6){bc='rgba(255,241,1,0.1)';
		}else if(i==7){bc='rgba(217,30,79,0.1)';
		}//endif
		if(i!=4){
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+0))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+2))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+4))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+5))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+7))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+9))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+11))+'px; width:'+width+'px; height:'+10+'px; background-color:'+bc+';"></div>';
		}//endif
		//black keys
		str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+1))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+3))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+6))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+8))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*i+10))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(0,0,0,0.07);"></div>';
	}//endfor i
	str+='<div style="position:absolute; left:'+15+'px; top:'+(1000-10*(12*8+0))+'px; width:'+width+'px; height:'+10+'px; background-color:rgba(217,30,79,0.1);"></div>';

	//Draw time lines
	for(var t=0;t<maxTime;t+=1){
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-legerWidth)+'px; top:'+40+'px; width:'+0+'px; height:'+970+'px; border:'+legerWidth+'px solid rgba(30,30,30,0.3);"></div>';
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-4)+'px; top:'+20+'px; width:'+0+'px; height:'+10*heightUnit+'px; color:rgba(30,30,30,0.3); font-size:8pt">'+t+'</div>';
	}//endfor t

	//Draw notes
	for(var ichan=0;ichan<2;ichan+=1){
		for(var i=0,len=fin.length;i<len;i+=1){
			if(fin[i].channel!=ichan){continue;}
			var finEvt=fin[i];//finEvt.pitch
			//Note box
			str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-1)+'px; top:'+(1120-10*finEvt.pitch)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; border:1px solid rgba(50,50,50,1);"></div>';
			if(mode==0){
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:red; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:blue; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}//endif
			}else{
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}//endif
			}//endif
		}//endfor i
	}//endfor ichan

	document.getElementById('display').innerHTML+=str;

}//endif



	$(function(){
		$('#display > *').keyup(function(){
			if(mode>0){return;}
			selectedPos = this;
			if(selectedPos.id.indexOf('note')==-1){return;}
			if(selectedPos.innerHTML==''){return;}
//			console.log(selectedPos.id);
			noteID=parseInt(selectedPos.id.slice(4),10);
			if(selectedPos.innerHTML==fin[noteID].fingerRep){return;}
//			console.log(selectedPos.innerHTML);
			fin[noteID].fingerRep=selectedPos.innerHTML;
			if(edits.length>0){
				if(edits[edits.length-1][1]=='ChangeFinger' && edits[edits.length-1][0]==noteID){
					edits[edits.length-1][2]=selectedPos.innerHTML;
				}else{
					edits.push([noteID,'ChangeFinger',selectedPos.innerHTML]);
				}//endif
			}else{
				edits.push([noteID,'ChangeFinger',selectedPos.innerHTML]);
			}//endif
			UpdateFreeText();
		});

		$('#display > *').dblclick(function(){
			if(mode>0){return;}
			selectedPos = this;
			if(selectedPos.id.indexOf('note')==-1){return;}
//			console.log(selectedPos.id);
			noteID=parseInt(selectedPos.id.slice(4),10);
			fin[noteID].channel=1-fin[noteID].channel;
			if(fin[noteID].channel==0){//To right hand
				selectedPos.style.color='red';
				selectedPos.style.backgroundColor='rgba(50,255,0,0.8)';
			}else{//To left hand
				selectedPos.style.color='blue';
				selectedPos.style.backgroundColor='rgba(255,120,30,0.8)';
			}//endif
			edits.push([noteID,'ChangeHand',fin[noteID].channel]);
			UpdateFreeText();
		});


	});

}//end Draw



function UpdateFreeText(){
	str='';
	for(var i=edits.length-1;i>=0;i-=1){
		if(edits[i][1]=='ChangeHand'){
			str+='Hand of '+edits[i][0]+' ('+fin[edits[i][0]].ontime+' s, '+fin[edits[i][0]].sitch+') -> '+((edits[i][2]==0)? "RH":"LH")+'\n';
			continue;
		}//endif
		str+='fingerRep of '+edits[i][0]+' ('+fin[edits[i][0]].ontime+' s, '+fin[edits[i][0]].sitch+') -> '+edits[i][2]+'\n';
	}//endfor i
	document.getElementById('freetext').value=str;
}//end UpdateFreeText


function ClearDisplay(){
	maxTime=2.1;
	fin=[];
	document.getElementById('filename1').value='';
	document.getElementById('filename2').value='';
	Draw();
}//end ClearDisplay


function ShowResult(){
	str='//Version: PianoFingering_v170101\n';
		for(var i=0,len=fin.length;i<len;i+=1){
			str+=fin[i].ID+'\t'+fin[i].ontime.toFixed(6)+'\t'+fin[i].offtime.toFixed(6)+'\t'+fin[i].sitch+'\t'+fin[i].onvel+'\t'+fin[i].offvel+'\t'+fin[i].channel+'\t';
			if(fin[i].channel==1){str+='-';}
			str+=fin[i].fingerRep+'\n';
	}//endfor i
	document.getElementById('freetext').value=str;
}//end ShowResult

function ShowDifficulty(){
	heightC4=320;
	yoffset=120;
	Draw();

	diff=[];
	for(var n=0,len=fin.length;n<len;n+=1){diff.push([20,30,50]);}
	//Calculate difficulty

	for(var n=0,len=fin.length;n<len;n+=1){
		var nstart=n,nend=n;
		var notes=[[],[]];//notes[0]=RHNotes,notes[1]=LHNotes
		notes[fin[n].channel].push(n);

		for(var m=n-1;m>=0;m-=1){
			if(fin[m].ontime<fin[n].ontime-0.5){break;}
			nstart=m;
			notes[fin[m].channel].push(m);
		}//endfor m
		for(var m=n+1,len=fin.length;m<len;m+=1){
			if(fin[m].ontime>fin[n].ontime+0.5){break;}
			nend=m;
			notes[fin[m].channel].push(m);
		}//endfor m

		notes[0].sort(CompareFunc);
		notes[1].sort(CompareFunc);

		for(var h=0;h<2;h+=1){
			diff[n][h]=0;
			if(notes[h].length<2){continue;}
			var pitches=[];
			var fingerNums=[];
			for(var i=0;i<notes[h].length;i+=1){
				pitches.push(fin[notes[h][i]].pitch);
				if(h==0){
					fingerNums.push(parseInt(fin[notes[h][i]].fingerNum[0])-1);
				}else{
					fingerNums.push(parseInt(fin[notes[h][i]].fingerNum[1])-1);
				}//endif
			}//endfor i
			for(var i=1;i<pitches.length;i+=1){
				var keyInt=SubtrKeyPos(new KeyPos(pitches[i]),new KeyPos(pitches[i-1]));
				if(keyInt.x<-model.widthX){keyInt.x=-model.widthX;}
				if(keyInt.x>model.widthX){keyInt.x=model.widthX;}
				diff[n][h]-=model.trProb[h][fingerNums[i-1]].LP[fingerNums[i]]+model.outProb[h][fingerNums[i-1]][fingerNums[i]].LP[3*(keyInt.x+model.widthX)+keyInt.y+1];
			}//endfor i
		}//endfor h

		diff[n][2]=diff[n][0]+diff[n][1];

	}//endfor n

	var str='';
	///Draw difficulty grids
	width=maxTime*pxPerSec;
	for(var i=0;i<=10;i+=1){
		if(i==5){
			str+='<div style="position:absolute; left:'+(xoffset)+'px; top:'+(10*i+10)+'px; width:'+width+'px; height:0px; border:'+0.8+'px solid rgba(0,0,0,1);"></div>';
		}else{
			str+='<div style="position:absolute; left:'+(xoffset)+'px; top:'+(10*i+10)+'px; width:'+width+'px; height:0px; border:'+0.5+'px solid rgba(0,0,0,0.5);"></div>';
		}//endif
		if(i%2!=0){continue;}
		str+='<div style="position:absolute; left:'+(xoffset-25)+'px; top:'+(10*i+3)+'px; width:0px; height:0px; color:rgba(120,50,150,0.7); font-size:8pt">'+10*(10-i)+'</div>';
	}//endfor i

	if(fin.length==0){return;}

	var starttimes=[],endtimes=[],diffRep=[];
	starttimes.push(fin[0].ontime);
	diffRep.push(diff[0].concat());
	var prevtime=fin[0].ontime;
	for(var n=1,len=fin.length;n<len;n+=1){
		if(fin[n].ontime==prevtime){continue;}//endif
		prevtime=fin[n].ontime;
		endtimes.push(prevtime);
		starttimes.push(prevtime);
		diffRep.push(diff[n].concat());
	}//endfor n
	endtimes.push(fin[fin.length-1].offtime);

	for(var i=0,len=starttimes.length;i<len;i+=1){
		if(diffRep[i][0]>diffRep[i][1]){
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][1])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][1])+'px; background-color:rgba(150,150,15,0.5);"></div>';
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][0])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][0]-diffRep[i][1])+'px; background-color:rgba(50,255,0,0.5);"></div>';
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][2])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][2]-diffRep[i][0])+'px; background-color:rgba(0,0,0,0.5);"></div>';
		}else{
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][0])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][0])+'px; background-color:rgba(150,150,15,0.5);"></div>';
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][1])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][1]-diffRep[i][0])+'px; background-color:rgba(255,120,30,0.5);"></div>';
			str+='<div style="position:absolute; left:'+(starttimes[i]*pxPerSec+xoffset)+'px; top:'+(110-diffRep[i][2])+'px; width:'+((endtimes[i]-starttimes[i])*pxPerSec)+'px; height:'+(diffRep[i][2]-diffRep[i][1])+'px; background-color:rgba(0,0,0,0.5);"></div>';
		}//endif
	}//endfor i

	document.getElementById('display').innerHTML+=str;

}//end ShowDifficulty

function ClearDifficulty(){
	heightC4=200;
	yoffset=0;
}//end ClearDifficulty


var elDrop1 = document.getElementById('dropzone1');

elDrop1.addEventListener('dragover', function(event) {
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
	elDrop1.classList.add('dropover');
});

elDrop1.addEventListener('dragleave', function(event) {
	elDrop1.classList.remove('dropover');
});

elDrop1.addEventListener('drop', function(event) {
	event.preventDefault();
	elDrop1.classList.remove('dropover');
	files=event.dataTransfer.files;
	document.getElementById('filename1').value='';
//	for(var i=0;i<files.length;i+=1){
	ReadFile(files[0]);
	document.getElementById('filename1').value+=files[0].name+'\n';
//	}//endfor i
});

$("#filein1").change(function(evt){
	files=evt.target.files;
	document.getElementById('filename1').value='';
//	for(var i=0;i<files.length;i+=1){
	ReadFile(files[0]);
	document.getElementById('filename1').value+=files[0].name+'\n';
//	}//endfor i
});


document.getElementById('drawButton').addEventListener('click', function(event){
	Draw();
});

document.getElementById('clearButton').addEventListener('click', function(event){
//	ShowResult();
	ClearDisplay();
});

document.getElementById('display').addEventListener('change', (event) => {
	console.log('changed');
});

document.getElementById('downloadButton').addEventListener('click', function(event){
	str='//Version: PianoFingering_v170101\n';
		for(var i=0,len=fin.length;i<len;i+=1){
			str+=fin[i].ID+'\t'+fin[i].ontime.toFixed(6)+'\t'+fin[i].offtime.toFixed(6)+'\t'+fin[i].sitch+'\t'+fin[i].onvel+'\t'+fin[i].offvel+'\t'+fin[i].channel+'\t';
			if(fin[i].channel==1){str+='-';}
			str+=fin[i].fingerRep+'\n';
	}//endfor i
	const a = document.createElement('a');
	a.href = URL.createObjectURL(new Blob([str], {type: 'text/plain'}));
	a.download = 'fingering.txt';
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
});

document.getElementById('minusButton').addEventListener('click', function(event){
	pxPerSec/=1.2;
	Draw();
	document.getElementById('display').scrollLeft=(document.getElementById('display').scrollLeft+500-xoffset)/1.2+xoffset-500;
});

document.getElementById('plusButton').addEventListener('click', function(event){
	pxPerSec*=1.2;
	Draw();
	document.getElementById('display').scrollLeft=1.2*(document.getElementById('display').scrollLeft+500-xoffset)+xoffset-500;
});

document.getElementById('showIDButton').addEventListener('click', function(event){
	if(document.getElementById('showIDButton').value=='Show ID'){
		mode=1;
		Draw();
		document.getElementById('showIDButton').value='Show Fingering';
	}else{
		mode=0;
		Draw();
		document.getElementById('showIDButton').value='Show ID';
	}//endif
});

document.getElementById('splitPartsButton').addEventListener('click', function(event){
	handSepModel.fin=fin;
	handSepModel.SeparateHands();
	fin=handSepModel.fin;
	Draw();
});

document.getElementById('estimateButton').addEventListener('click', function(event){
	model.fin=fin;
	model.ViterbiTwoHands();
	fin=model.fin;
	Draw();
});

document.getElementById('difficultyButton').addEventListener('click', function(event){
	ShowDifficulty();
});

var synthOption = {
	oscillator:{
		type:"sine"
	},
	envelope:{
		attack: 0.001,
		decay: 0.3,
		sustain: 0.5,
		release: 1
	}
};

function SetListenButton(){
//	var synth = new Tone.Synth(synthOption).toMaster();
	var synth = new Tone.PolySynth(10).toMaster();
	document.getElementById('listenButton').addEventListener('click', function(event) {
		console.log('clicked');

		var str='<div id="timeline" style="position:absolute; left:'+(startTime*pxPerSec+xoffset)+'px; top:'+0+'px; width:'+0+'px; height:'+1000+'px; border:'+legerWidth+'px solid rgba(30,120,255,0.9);"></div>';
		document.getElementById('display').innerHTML+=str;

		synth = new Tone.PolySynth(10).toMaster();
		var now = Tone.now();
//		synth.triggerAttackRelease('C5',2,now+1);
//		synth.triggerAttackRelease('A4',2,now+2);
		var startTime=Number($("#listenSpeed").val());
		for(var n=0,len=fin.length;n<len;n+=1){
			if(fin[n].ontime<startTime){continue;}
			synth.triggerAttackRelease(fin[n].sitch,(fin[n].offtime-fin[n].ontime), now+fin[n].ontime-startTime);
		}//endfor i

		$('#timeline').css({
			left:startTime*pxPerSec+xoffset
		}).animate({
			left:maxTime*pxPerSec+xoffset
		},(maxTime-startTime)*1000,'linear');

		document.getElementById('display').scrollLeft=startTime*pxPerSec-500-xoffset;
		$('#display').animate({
			scrollLeft:maxTime*pxPerSec-500-xoffset
		},(maxTime-startTime)*1000,'linear');

//	document.getElementById('display').scrollLeft=(document.getElementById('display').scrollLeft+500-xoffset)/1.2+xoffset-500;

	});

	document.getElementById('stopButton').addEventListener('click', function(event) {
		console.log('clicked');
		synth.disconnect();
		var dom_obj = document.getElementById('timeline');
		var dom_obj_parent = dom_obj.parentNode;
		dom_obj_parent.removeChild(dom_obj);
		$('#display').stop();
	});
}//end SetListenButton




//	console.log();








