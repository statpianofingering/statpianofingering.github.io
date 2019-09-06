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
var mode=0;//0:fingering, 1:ID, 2:noID
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

function ChanneltToColor(channel){
	if(channel==0){
		return "background-color:rgba(50,255,0,0.7); color:red;";
	}else if(channel==1){
		return "background-color:rgba(255,120,30,0.7); color:blue;";
	}else if(channel==2){
		return "background-color:rgba(255,30,120,0.7); color:aqua;";
	}else if(channel==3){
		return "background-color:rgba(30,120,255,0.7); color:aqua;";
	}else if(channel==4){
		return "background-color:rgba(120,30,120,0.7); color:aqua;";
	}else if(channel==5){
		return "background-color:rgba(255,255,30,0.7); color:aqua;";
	}else if(channel==6){
		return "background-color:rgba(30,255,255,0.7); color:aqua;";
	}else if(channel==7){
		return "background-color:rgba(255,30,30,0.7); color:aqua;";
	}else if(channel==8){
		return "background-color:rgba(120,30,30,0.7); color:aqua;";
	}else if(channel==9){
		return "background-color:rgba(120,180,0,0.7); color:aqua;";
	}else if(channel==10){
		return "background-color:rgba(30,180,180,0.7); color:aqua;";
	}else if(channel==11){
		return "background-color:rgba(255,180,180,0.7); color:aqua;";
	}else{
		return "background-color:rgba(120,120,120,0.7); color:white;";
	}//endif
}//end ChanneltToColor

function ReadFile(file,addmode=1){
	var reader = new FileReader();

	if(file.name.indexOf('.mid')==-1
	   && file.name.indexOf('ipr.txt')==-1
	   && file.name.indexOf('spr.txt')==-1
	   && file.name.indexOf('fin.txt')==-1
	   && file.name.indexOf('fingering.txt')==-1
	){
		alert('Accepted file formats:\n.mid / ipr.txt / spr.txt / fin.txt / fingering.txt');
		return;
	}//endif

	if(file.name.indexOf('.mid')>=0){//MIDI file
	
		let pr = new PianoRoll();
		pr.ReadMIDIFile(file).then(() => {

// 			console.log("- in pr.ReadMIDIFile(file).then()");
// 			console.log(pr.evts.length);
// 			console.log("- pr.ReadMIDIfile(file).then()");

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

		});//end then

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
		line1.setAttribute('y1',heightC4+heightUnit*i);
		line1.setAttribute('y2',heightC4+heightUnit*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(120,120,120)');
		line1.setAttribute('stroke-width',1);
		mysvg.appendChild(line1);
	}//endfor i

	var str='';

	//Draw time lines
	for(var t=0;t<maxTime;t+=1){
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-legerWidth)+'px; top:'+(heightC4-15*heightUnit-legerWidth)+'px; width:'+0+'px; height:'+9*heightUnit+'px; border:'+legerWidth+'px solid rgba(30,120,255,0.4);"></div>';
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-6)+'px; top:'+(heightC4-15*heightUnit-legerWidth-20)+'px; width:'+0+'px; height:'+0*heightUnit+'px; color:rgba(30,120,255,0.4); font-size:8pt">'+t+'</div>';
	}//endfor t
	str+='<img src="img/Gclef.png" height="'+(7.5*heightUnit)+'" style="position:absolute; left:'+(20)+'px; top:'+(heightC4-6.5*heightUnit)+'px;"/>';
	str+='<img src="img/Fclef.png" height="'+(3.4*heightUnit)+'" style="position:absolute; left:'+(20+3)+'px; top:'+(heightC4+0.9*heightUnit)+'px;"/>';

	//Draw notes
	for(var ichan=0;ichan<16;ichan+=1){
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
				str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; '+ChanneltToColor(ichan)+' font-size:7px;">'+finEvt.fingerRep+'</div>';
/*
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:red; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:blue; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}//endif
*/
			}else if(mode==1){
				str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; '+ChanneltToColor(ichan)+' font-size:7px;">'+finEvt.ID+'</div>';
/*
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}//endif
*/
			}else if(mode==2){
				str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(-(1+sitchHeight)*5+heightC4+0.5)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; '+ChanneltToColor(ichan)+' font-size:7px;"></div>';
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
		line1.setAttribute('y1',-7*heightUnit+heightUnit*i);
		line1.setAttribute('y2',-7*heightUnit+heightUnit*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(0,0,0)');
		line1.setAttribute('stroke-width',1.3);
		mysvg.appendChild(line1);
	}//endfor i
	for(var i=19;i<=108;i+=12){
		var line1=document.createElementNS('http://www.w3.org/2000/svg','line');
		line1.setAttribute('x1',15);
		line1.setAttribute('x2',15+width);
		line1.setAttribute('y1',-7*heightUnit+heightUnit*i);
		line1.setAttribute('y2',-7*heightUnit+heightUnit*i);
		line1.setAttribute('stroke-opacity',1);
		line1.setAttribute('stroke','rgb(0,0,0)');
		line1.setAttribute('stroke-width',1);
		mysvg.appendChild(line1);
	}//endfor i

	var str='';
	for(var i=0;i<=8;i+=1){
		if(i==4){
			str+='<div style="position:absolute; left:'+2+'px; top:'+(100*heightUnit-heightUnit*12*i)+'px; width:'+0+'px; height:'+heightUnit+'px; color:rgba(255,30,120,1); font-size:7pt">C'+i+'</div>';
		}else{
			str+='<div style="position:absolute; left:'+2+'px; top:'+(100*heightUnit-heightUnit*12*i)+'px; width:'+0+'px; height:'+heightUnit+'px; color:rgba(0,0,0,1); font-size:7pt">C'+i+'</div>';
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
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+0))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+2))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+4))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+5))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+7))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+9))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
			str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+11))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:'+bc+';"></div>';
		}//endif
		//black keys
		str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+1))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+3))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+6))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+8))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(0,0,0,0.07);"></div>';
		str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*i+10))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(0,0,0,0.07);"></div>';
	}//endfor i
	str+='<div style="position:absolute; left:'+15+'px; top:'+(100*heightUnit-heightUnit*(12*8+0))+'px; width:'+width+'px; height:'+heightUnit+'px; background-color:rgba(217,30,79,0.1);"></div>';

	//Draw time lines
	for(var t=0;t<maxTime;t+=1){
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-legerWidth)+'px; top:'+20+'px; width:'+0+'px; height:'+97*heightUnit+'px; border:'+legerWidth+'px solid rgba(30,120,255,0.4);"></div>';
		str+='<div style="position:absolute; left:'+(t*pxPerSec+xoffset-4)+'px; top:'+5+'px; width:'+0+'px; height:'+10*heightUnit+'px; color:rgba(30,120,255,0.4); font-size:8pt">'+t+'</div>';
	}//endfor t

	//Draw notes
	for(var ichan=0;ichan<16;ichan+=1){
		for(var i=0,len=fin.length;i<len;i+=1){
			if(fin[i].channel!=ichan){continue;}
			var finEvt=fin[i];//finEvt.pitch
			//Note box
			str+='<div style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset-1)+'px; top:'+(112*heightUnit-heightUnit*finEvt.pitch)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:'+(heightUnit-1)+'px; border:1px solid rgba(50,50,50,1);"></div>';
			if(mode==0){
				str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(112*heightUnit-heightUnit*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:'+(heightUnit-1)+'px; '+ChanneltToColor(ichan)+' font-size:7px;">'+finEvt.fingerRep+'</div>';
/*
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:red; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" contentEditable=true style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:blue; font-size:7px;">'+finEvt.fingerRep+'</div>';
				}//endif
*/
			}else if(mode==1){
				str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(112*heightUnit-heightUnit*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:'+(heightUnit-1)+'px; '+ChanneltToColor(ichan)+' font-size:7px;">'+finEvt.ID+'</div>';
/*
				if(ichan==0){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(50,255,0,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}else if(ichan==1){
					str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(1120-10*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:9px; background-color:rgba(255,120,30,0.8); color:black; font-size:7px;">'+finEvt.ID+'</div>';
				}//endif
*/
			}else if(mode==2){
				str+='<div id="note'+finEvt.ID+'" style="position:absolute; left:'+(finEvt.ontime*pxPerSec+xoffset)+'px; top:'+(112*heightUnit-heightUnit*finEvt.pitch+1)+'px; width:'+(finEvt.offtime-finEvt.ontime)*pxPerSec+'px; height:'+(heightUnit-1)+'px; '+ChanneltToColor(ichan)+' font-size:7px;"></div>';
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
			if(fin[noteID].channel==0){//To right hand
				fin[noteID].fingerNum=fin[noteID].fingerRep;
			}else{//To left hand
				fin[noteID].fingerNum='-'+fin[noteID].fingerRep;
			}//endif
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
				fin[noteID].fingerNum=fin[noteID].fingerRep;
			}else{//To left hand
				selectedPos.style.color='blue';
				selectedPos.style.backgroundColor='rgba(255,120,30,0.8)';
				fin[noteID].fingerNum='-'+fin[noteID].fingerRep;
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
			str+='<div style="position:absolute; left:'+(xoffset)+'px; top:'+(10*i+10)+'px; width:'+width+'px; height:0px; border:'+0.8+'px solid rgba(255,30,120,1);"></div>';
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
	a.download = 'fin.txt';
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

document.getElementById('narrowButton').addEventListener('click', function(event){
	heightUnit/=1.2;
	Draw();
});

document.getElementById('wideButton').addEventListener('click', function(event){
	heightUnit*=1.2;
	Draw();
});

document.getElementById('showIDButton').addEventListener('click', function(event){
	if(document.getElementById('showIDButton').value=='Show ID'){
		mode=1;
		Draw();
		document.getElementById('showIDButton').value='Hide Label';
	}else if(document.getElementById('showIDButton').value=='Hide Label'){
		mode=2;
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

		synth = new Tone.PolySynth(20).toMaster();
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
		Draw();
	});
}//end SetListenButton


//	console.log();








