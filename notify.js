YAHOO.namespace("lacuna");

if (typeof YAHOO.lacuna.Notify == "undefined" || !YAHOO.lacuna.Notify) {
	
(function(){
	var Lang = YAHOO.lang,
		Util = YAHOO.util,
		Dom = Util.Dom,
		Event = Util.Event,
		Lacuna = YAHOO.lacuna,
		Game = Lacuna.Game,
		Lib = Lacuna.Library;
		
	var Notify = function(){
		this.incomingShips = {};
	};
	Notify.prototype = {
		_createDisplay : function() {
			if(!this.Display) {
				var container = document.createElement("div");
				container.id = "notify";
				Dom.addClass(container, Lib.Styles.HIDDEN);
				Dom.addClass(container, "nofooter");
				container.innerHTML = this._getHtml();
				document.body.insertBefore(container, document.body.firstChild);
				
				this.Display = new YAHOO.widget.Panel("notify", {
					constraintoviewport:true,
					visible:false,
					draggable:true,
					effect:Game.GetContainerEffect(),
					close:false,
					underlay:false,
					modal:false,
					width:"180px",
					context:["header","tr","br", ["beforeShow", "windowResize"], [0,40]]
				});
				this.Display.renderEvent.subscribe(function(){
					this.notifyList = Dom.get('notifyList');
					this.notify = Dom.get("notify");
					
					Dom.removeClass(this.notify, Lib.Styles.HIDDEN);
				});
				this.Display.showEvent.subscribe(function(){
					Dom.setStyle(this.notifyList.parentNode, "max-height", (Game.GetSize().h - 125) + "px");
				});
				this.Display.render();
			}
		},
		_getHtml : function() {
			return [
			'	<div class="hd" style="background:transparent;">Incoming Ships!</div>',
			'	<div class="bd" style="background: url(',Lib.AssetUrl,'ui/transparent_black.png) repeat scroll 0pt 0pt transparent;">',
			'		<div style="overflow:auto;">',
			'			<ul id="notifyList"></ul>',
			'		</div>',
			'	</div>'
			].join('');
		},
		_updating : function() {
			var list = this.Display.notifyList;
			var planetShips = this.incomingShips[this.planetId] || [], 
				arr = [],
				i = 0;
			if(planetShips.length === 0) {
				arr = arr.concat(['<li>None</li>']);
			}
			else {
				var serverTime = Lib.getTime(Game.ServerData.time);
				for(var s=0; s<planetShips.length;s++) {
					var ship = planetShips[s],
						ms = Lib.getTime(ship.date_arrives) - serverTime,
						color = (ship.is_own == 1 ? "#0f0" : (ship.is_ally == 1 ? "#b0b" : "#fff")),
						arrTime;
					i++;
					if(ms > 0) {
						arrTime = Lib.formatMillisecondTime(ms);
					}
					else {
						arrTime = 'Overdue ' + Lib.formatMillisecondTime(-ms);
					}
					arr = arr.concat(['<li><label style="color:#FFD800;">',i, ')</label> <span style="color:',color,';">', arrTime,'</span></li>']);
				}
			}
			
			list.innerHTML = arr.join('');
			if(i == 0) {
				Game.onTick.unsubscribe(this._updating);
				delete this.subscribed;
				this.incomingShips = {};
				this.Hide();
			}
			else {
				this.Display.show();
			}
		},
		Load : function(planet) {
			var incoming = planet.incoming_foreign_ships || [],
				planetShips = this.incomingShips[planet.id] || [];
			
			incoming.sort(function(a,b) {
				if (a.date_arrives > b.date_arrives) {
					return 1;
				}
				else if (a.date_arrives < b.date_arrives) {
					return -1;
				}
				else {
					return 0;
				}
			});
			
			if(planetShips.length != incoming.length) {
				this._createDisplay();
				this.incomingShips[planet.id] = incoming;
				this.planetId = planet.id;

				if(!this.subscribed) {
					Game.onTick.subscribe(this._updating, this, true);
					this.subscribed = 1;
				}
				this.Display.show();
				this.Display.bringToTop();
			}
		},
		Show : function(planetId) {
			this.planetId = planetId;
			if(this.Display) {
				if(this.subscribed && this.incomingShips[planetId]) {
					this.Display.show();
					this.Display.bringToTop();
				}
				else {
					this.Display.hide();
				}
			}
		},
		Hide : function() {
			if(this.Display) {
				this.Display.hide();
			}
			delete this.planetId;
		}
	};
	
	Lacuna.Notify = new Notify();
		
})();
YAHOO.register("notify", YAHOO.lacuna.Notify, {version: "1", build: "0"}); 

}
// vim: noet:ts=4:sw=4
