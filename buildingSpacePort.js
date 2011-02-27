YAHOO.namespace("lacuna.buildings");

if (typeof YAHOO.lacuna.buildings.SpacePort == "undefined" || !YAHOO.lacuna.buildings.SpacePort) {
	
(function(){
	var Lang = YAHOO.lang,
		Util = YAHOO.util,
		Dom = Util.Dom,
		Event = Util.Event,
		Sel = Util.Selector,
		Pager = YAHOO.widget.Paginator,
		Lacuna = YAHOO.lacuna,
		Game = Lacuna.Game,
		Lib = Lacuna.Library;

	var SpacePort = function(result){
		SpacePort.superclass.constructor.call(this, result);
		
		this.service = Game.Services.Buildings.SpacePort;
	};
	
	Lang.extend(SpacePort, Lacuna.buildings.Building, {
		destroy : function() {
			if(this.shipsPager) {
				this.shipsPager.destroy();
			}
			if(this.viewPager) {
				this.viewPager.destroy();
			}
			if(this.foreignPager) {
				this.foreignPager.destroy();
			}
			SpacePort.superclass.destroy.call(this);
		},
		getChildTabs : function() {
			return [this._getTravelTab(), this._getViewTab(), this._getForeignTab(), this._getSendTab()];
		},
		_getTravelTab : function() {
			this.travelTab = new YAHOO.widget.Tab({ label: "Traveling", content: [
				'<div>',
				'	<div style="overflow:auto;margin-top:2px;">',
				'		<ul id="shipDetails">',
				'		</ul>',
				'	</div>',
				'	<div id="shipsPaginator"></div>',
				'</div>'
			].join('')});
			/*
			
				'	<ul class="shipHeader shipInfo clearafter">',
				'		<li class="shipTypeImage">&nbsp;</li>',
				'		<li class="shipName">Name</li>',
				'		<li class="shipArrives">Arrives</li>',
				'		<li class="shipFrom">From</li>',
				'		<li class="shipTo">To</li>',
				'		<li class="shipSpeed">Speed</li>',
				'		<li class="shipHold">Hold Size</li>',
				'		<li class="shipHold">Stealth</li>',
				'	</ul>',
				'	<div><div id="shipDetails"></div></div>',
			*/
			//subscribe after adding so active doesn't fire
			this.travelTab.subscribe("activeChange", this.getTravel, this, true);
			
			return this.travelTab;
		},
		_getViewTab : function() {
			this.viewShipsTab = new YAHOO.widget.Tab({ label: "View", content: [
				'<div>',
				'	<div id="shipsCount"></div>',	
				'	<ul class="shipHeader shipInfo clearafter">',
				'		<li class="shipTypeImage">&nbsp;</li>',
				'		<li class="shipName">Name</li>',
				'		<li class="shipTask">Task</li>',
				'		<li class="shipSpeed">Speed</li>',
				'		<li class="shipHold">Hold Size</li>',
				'		<li class="shipHold">Stealth</li>',
				'		<li class="shipHold">Combat</li>',
				'	</ul>',
				'	<div style="overflow:auto;"><div id="shipsViewDetails"></div></div>',
				'	<div id="shipsViewPaginator"></div>',
				'</div>'
			].join('')});
			//subscribe after adding so active doesn't fire
			this.viewShipsTab.subscribe("activeChange", this.getShips, this, true);
			
			return this.viewShipsTab;
		},
		_getForeignTab : function() {
			this.foreignShipsTab = new YAHOO.widget.Tab({ label: "Incoming", content: [
				'<div>',
				'	<ul class="shipHeader shipInfo clearafter">',
				'		<li class="shipTypeImage">&nbsp;</li>',
				'		<li class="shipName">Name</li>',
				'		<li class="shipArrives">Arrives</li>',
				'		<li class="shipFrom">From</li>',
				'	</ul>',
				'	<div><div id="shipsForeignDetails"></div></div>',
				'	<div id="shipsForeignPaginator"></div>',
				'</div>'
			].join('')});
			//subscribe after adding so active doesn't fire
			this.foreignShipsTab.subscribe("activeChange", this.getForeign, this, true);
			
			return this.foreignShipsTab;
		},
		_getSendTab : function() {
			this.sendTab = new YAHOO.widget.Tab({ label: "Send", content: [
				'<div id="sendShipPick">',
				'	Send To <select id="sendShipType"><option value="body_name">Planet Name</option><option value="body_id">Planet Id</option><option value="star_name">Star Name</option><option value="star_id">Star Id</option><option value="xy">X,Y</option></select>',
				'	<span id="sendShipTargetSelectText"><input type="text" id="sendShipTargetText" /></span>',
				'	<span id="sendShipTargetSelectXY" style="display:none;">X:<input type="text" id="sendShipTargetX" /> Y:<input type="text" id="sendShipTargetY" /></span>',
				'	<button type="button" id="sendShipGet">Get Available Ships For Target</button>',
				'</div>',
				'<div id="sendShipSend" style="display:none;border-top:1px solid #52ACFF;margin-top:5px;padding-top:5px">',
				'	Sending ships to: <span id="sendShipNote"></span>',
				'	<div style="border-top:1px solid #52ACFF;margin-top:5px;"><ul id="sendShipAvail"></ul></div>',
				'</div>'
			].join('')});
			
			Event.on("sendShipType", "change", function(){
				if(Lib.getSelectedOptionValue(this) == "xy") {
					Dom.setStyle("sendShipTargetSelectText", "display", "none");
					Dom.setStyle("sendShipTargetSelectXY", "display", "");
				}
				else {
					Dom.setStyle("sendShipTargetSelectText", "display", "");
					Dom.setStyle("sendShipTargetSelectXY", "display", "none");
				}
			});
			Event.on("sendShipGet", "click", this.GetShipsFor, this, true);
			
			return this.sendTab;
		},
		
		getTravel : function(e) {
			if(e.newValue) {
				if(!this.shipsTraveling) {
					Lacuna.Pulser.Show();
					this.service.view_ships_travelling({session_id:Game.GetSession(),building_id:this.building.id,page_number:1}, {
						success : function(o){
							YAHOO.log(o, "info", "SpacePort.view_ships_travelling.success");
							Lacuna.Pulser.Hide();
							this.rpcSuccess(o);
							this.shipsTraveling = {
								number_of_ships_travelling: o.result.number_of_ships_travelling,
								ships_travelling: o.result.ships_travelling
							};
							this.shipsPager = new Pager({
								rowsPerPage : 25,
								totalRecords: o.result.number_of_ships_travelling,
								containers  : 'shipsPaginator',
								template : "{PreviousPageLink} {PageLinks} {NextPageLink}",
								alwaysVisible : false

							});
							this.shipsPager.subscribe('changeRequest',this.ShipHandlePagination, this, true);
							this.shipsPager.render();
							
							this.SpacePortPopulate();
						},
						failure : function(o){
							YAHOO.log(o, "error", "SpacePort.view_ships_travelling.failure");
							Lacuna.Pulser.Hide();
							this.rpcFailure(o);
						},
						timeout:Game.Timeout,
						scope:this
					});
				}
				else {
					this.SpacePortPopulate();
				}
			}
		},
		getShips : function(e) {
			if(e.newValue) {
				if(!this.shipsView) {
					Lacuna.Pulser.Show();
					this.service.view_all_ships({session_id:Game.GetSession(),building_id:this.building.id,page_number:1}, {
						success : function(o){
							YAHOO.log(o, "info", "SpacePort.view_all_ships.success");
							Lacuna.Pulser.Hide();
							this.rpcSuccess(o);
							this.shipsView = {
								number_of_ships: o.result.number_of_ships,
								ships: o.result.ships
							};
							this.viewPager = new Pager({
								rowsPerPage : 25,
								totalRecords: o.result.number_of_ships,
								containers  : 'shipsViewPaginator',
								template : "{PreviousPageLink} {PageLinks} {NextPageLink}",
								alwaysVisible : false

							});
							this.viewPager.subscribe('changeRequest',this.ViewHandlePagination, this, true);
							this.viewPager.render();
							
							this.ViewPopulate();
						},
						failure : function(o){
							YAHOO.log(o, "error", "SpacePort.view_all_ships.failure");
							Lacuna.Pulser.Hide();
							this.rpcFailure(o);
						},
						timeout:Game.Timeout,
						scope:this
					});
				}
				else {
					this.ViewPopulate();
				}
			}
		},
		getForeign : function(e) {
			if(e.newValue) {
				if(!this.shipsForeign) {
					Lacuna.Pulser.Show();
					this.service.view_foreign_ships({session_id:Game.GetSession(),building_id:this.building.id,page_number:1}, {
						success : function(o){
							YAHOO.log(o, "info", "SpacePort.view_foreign_ships.success");
							Lacuna.Pulser.Hide();
							this.rpcSuccess(o);
							this.shipsForeign = {
								number_of_ships: o.result.number_of_ships,
								ships: o.result.ships
							};
							this.foreignPager = new Pager({
								rowsPerPage : 25,
								totalRecords: o.result.number_of_ships,
								containers  : 'shipsForeignPaginator',
								template : "{PreviousPageLink} {PageLinks} {NextPageLink}",
								alwaysVisible : false

							});
							this.foreignPager.subscribe('changeRequest',this.ForeignHandlePagination, this, true);
							this.foreignPager.render();
							
							this.ForeignPopulate();
						},
						failure : function(o){
							YAHOO.log(o, "error", "SpacePort.view_foreign_ships.failure");
							Lacuna.Pulser.Hide();
							this.rpcFailure(o);
						},
						timeout:Game.Timeout,
						scope:this
					});
				}
				else {
					this.ForeignPopulate();
				}
			}
		},
		
		SpacePortPopulate : function() {
			var ships = this.shipsTraveling.ships_travelling,
				details = Dom.get("shipDetails");

			if(details) {
				var parentEl = details.parentNode,
					li = document.createElement("li"),
					serverTime = Lib.getTime(Game.ServerData.time);

				Event.purgeElement(details);
				details = parentEl.removeChild(details);
				details.innerHTML = "";
				
				for(var i=0; i<ships.length; i++) {
					var ship = ships[i],
						nLi = li.cloneNode(false),
						sec = (Lib.getTime(ship.date_arrives) - serverTime) / 1000;
					
					nLi.innerHTML = ['<div class="yui-g" style="margin-bottom:2px;">',
					'<div class="yui-g first">',
					'	<div class="yui-u first" style="background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
					'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" title="',ship.type_human,'" style="width:75px;height:75px;" />',
					'	</div>',
					'	<div class="yui-u">',
					'		<span class="shipName">',ship.name,'</span>: ',
					'		<ul>',
					'			<li><label style="font-weight:bold;">Travel:</label></li>',
					'			<li style="white-space:nowrap;"><label style="font-style:italic">Arrives In: </label><span class="shipArrives">',Lib.formatTime(sec),'</span></li>',
					'			<li style="white-space:nowrap;"><label style="font-style:italic">From: </label><span class="shipFrom">',ship.from.name,'</span></li>',
					'			<li style="white-space:nowrap;"><label style="font-style:italic">To: </label><span class="shipTo">',ship.to.name,'</span></li>',
					'		</ul>',
					'	</div>',
					'</div>',
					'<div class="yui-g">',
					'	<div class="yui-u first">',
					'		<ul>',
					'		<li><label style="font-weight:bold;">Attributes:</label></li>',
					'		<li style="white-space:nowrap;"><label style="font-style:italic">Speed: </label>',ship.speed,'</li>',
					'		<li style="white-space:nowrap;"><label style="font-style:italic">Hold Size: </label>',ship.hold_size,'</li>',
					'		<li style="white-space:nowrap;"><label style="font-style:italic">Stealth: </label>',ship.stealth,'</li>',
					'		<li style="white-space:nowrap;"><label style="font-style:italic">Combat: </label>',ship.combat,'</li>',
					'		</ul>',
					'	</div>',
					'	<div class="yui-u">',
					'		<div><label style="font-weight:bold;">Payload:</label></div>',
					Lib.formatInlineList(ship.payload),
					'	</div>',
					'</div>',
					'</div>'].join('');
					var sn = Sel.query("span.shipName",nLi,true);
					Event.on(sn, "click", this.ShipName, {Self:this,Ship:ship,el:sn}, true);
					//Event.on(Sel.query("span.shipFrom",nLi,true), "click", this.EmpireProfile, ship.from);
					//Event.on(Sel.query("span.shipTo",nLi,true), "click", this.EmpireProfile, ship.to);
					
					this.addQueue(sec, this.SpacePortQueue, nLi);
					
					details.appendChild(nLi);
				}

				//add child back in
				parentEl.appendChild(details);

				//wait for tab to display first
				setTimeout(function() {
					var Ht = Game.GetSize().h - 170;
					if(Ht > 300) { Ht = 300; }
					var tC = details.parentNode;
					Dom.setStyle(tC,"height",Ht + "px");
					Dom.setStyle(tC,"overflow-y","auto");
				},10);
			}
		},
		ShipHandlePagination : function(newState) {
			Lacuna.Pulser.Show();
			this.service.view_ships_travelling({
				session_id:Game.GetSession(),
				building_id:this.building.id,
				page_number:newState.page
			}, {
				success : function(o){
					YAHOO.log(o, "info", "SpacePort.ShipHandlePagination.view_ships_travelling.success");
					Lacuna.Pulser.Hide();
					this.rpcSuccess(o);
					this.shipsTraveling = {
						number_of_ships_travelling: o.result.number_of_ships_travelling,
						ships_travelling: o.result.ships_travelling
					};
					this.SpacePortPopulate();
				},
				failure : function(o){
					YAHOO.log(o, "error", "SpacePort.ShipHandlePagination.view_ships_travelling.failure");
					Lacuna.Pulser.Hide();
					this.rpcFailure(o);
				},
				timeout:Game.Timeout,
				scope:this
			});
	 
			// Update the Paginator's state
			this.shipsPager.setState(newState);
		},
		SpacePortQueue : function(remaining, elLine){
			var arrTime;
			if(remaining <= 0) {
				arrTime = 'Overdue ' + Lib.formatTime(Math.round(-remaining));
			}
			else {
				arrTime = Lib.formatTime(Math.round(remaining));
			}
			Sel.query("span.shipArrives",elLine,true).innerHTML = arrTime;
		},
		
		ViewPopulate : function() {
			var details = Dom.get("shipsViewDetails");
			
			if(details) {
				var ships = this.shipsView.ships,
					ul = document.createElement("ul"),
					li = document.createElement("li"),
					info = Dom.get("shipsCount");
					
				Event.purgeElement(details);
				details.innerHTML = "";

				if(info && this.result.max_ships > 0) {
					info.innerHTML = ['This SpacePort can dock a maximum of ', this.result.max_ships, ' ships. There are ', this.result.docks_available, ' docks available.'].join(''); 
				}               
								
				for(var i=0; i<ships.length; i++) {
					var ship = ships[i],
						nUl = ul.cloneNode(false),
						nLi = li.cloneNode(false);
						
					nUl.Ship = ship;
					Dom.addClass(nUl, "shipInfo");
					Dom.addClass(nUl, "clearafter");

					Dom.addClass(nLi,"shipTypeImage");
					Dom.setStyle(nLi, "background", ['transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center'].join(''));
					Dom.setStyle(nLi, "text-align", "center");
					nLi.innerHTML = ['<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" title="',ship.type_human,'" style="width:50px;height:50px;" />'].join('');
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipName");
					nLi.innerHTML = ship.name;
					nUl.appendChild(nLi);
					Event.on(nLi, "click", this.ShipName, {Self:this,Ship:ship,el:nLi}, true);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipTask");
					nLi.innerHTML = ship.task;
					nUl.appendChild(nLi);
					
					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipSpeed");
					nLi.innerHTML = ship.speed;
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipHold");
					nLi.innerHTML = ship.hold_size;
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipHold");
					nLi.innerHTML = ship.stealth;
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipHold");
					nLi.innerHTML = ship.combat;
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipScuttle");
					if(ship.task == "Docked") {
						var bbtn = document.createElement("button");
						bbtn.setAttribute("type", "button");
						bbtn.innerHTML = "Scuttle";
						bbtn = nLi.appendChild(bbtn);
						Event.on(bbtn, "click", this.ShipScuttle, {Self:this,Ship:ship,Line:nUl}, true);
					}
					else if(ship.task == "Defend") {
						var dbtn = document.createElement("button");
						dbtn.setAttribute("type", "button");
						dbtn.innerHTML = "Recall";
						dbtn = nLi.appendChild(dbtn);
						Event.on(dbtn, "click", this.ShipRecall, {Self:this,Ship:ship,Line:nUl}, true);
					}
					nUl.appendChild(nLi);
								
					details.appendChild(nUl);
					
				}
				//wait for tab to display first
				setTimeout(function() {
					var Ht = Game.GetSize().h - 220;
					if(Ht > 300) { Ht = 300; }
					var tC = details.parentNode;
					Dom.setStyle(tC,"height",Ht + "px");
					Dom.setStyle(tC,"overflow-y","auto");
				},10);
			}
		},
		ViewHandlePagination : function(newState) {
			Lacuna.Pulser.Show();
			this.service.view_all_ships({
				session_id:Game.GetSession(),
				building_id:this.building.id,
				page_number:newState.page
			}, {
				success : function(o){
					YAHOO.log(o, "info", "SpacePort.ViewHandlePagination.view_all_ships.success");
					Lacuna.Pulser.Hide();
					this.rpcSuccess(o);
					this.shipsView = {
						number_of_ships: o.result.number_of_ships,
						ships: o.result.ships
					};
					this.ViewPopulate();
				},
				failure : function(o){
					YAHOO.log(o, "error", "SpacePort.ViewHandlePagination.view_all_ships.failure");
					Lacuna.Pulser.Hide();
					this.rpcFailure(o);
				},
				timeout:Game.Timeout,
				scope:this
			});
	 
			// Update the Paginator's state
			this.viewPager.setState(newState);
		},
		
		ShipName : function() {
			this.el.innerHTML = "";
			
			var inp = document.createElement("input"),
				bSave = document.createElement("button"),
				bCancel = bSave.cloneNode(false);
			inp.type = "text";
			inp.value = this.Ship.name;
			this.Input = inp;
			bSave.setAttribute("type", "button");
			bSave.innerHTML = "Save";
			Event.on(bSave,"click",this.Self.ShipNameSave,this,true);
			bCancel.setAttribute("type", "button");
			bCancel.innerHTML = "Cancel";
			Event.on(bCancel,"click",this.Self.ShipNameClear,this,true);
						
			Event.removeListener(this.el, "click");		
				
			this.el.appendChild(inp);
			this.el.appendChild(document.createElement("br"));
			this.el.appendChild(bSave);
			this.el.appendChild(bCancel);
		},
		ShipNameSave : function(e) {
			Event.stopEvent(e);
			Lacuna.Pulser.Show();
			var newName = this.Input.value;
			
			this.Self.service.name_ship({
				session_id:Game.GetSession(),
				building_id:this.Self.building.id,
				ship_id:this.Ship.id,
				name:newName
			}, {
				success : function(o){
					YAHOO.log(o, "info", "SpacePort.ShipNameSave.success");
					Lacuna.Pulser.Hide();
					this.Self.rpcSuccess(o);
					delete this.Self.shipsView;
					delete this.Self.shipsTraveling;
					this.Ship.name = newName;
					if(this.Input) {
						this.Input.value = newName;
					}
					this.Self.ShipNameClear.call(this);
				},
				failure : function(o){
					YAHOO.log(o, "error", "SpacePort.ShipNameSave.failure");
					Lacuna.Pulser.Hide();
					this.Self.rpcFailure(o);
					if(this.Input) {
						this.Input.value = this.Ship.name;
					}
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		ShipNameClear : function(e) {
			if(e) { Event.stopEvent(e); }
			if(this.Input) {
				delete this.Input;
			}
			if(this.el) {
				Event.purgeElement(this.el);
				this.el.innerHTML = this.Ship.name;
				Event.on(this.el, "click", this.Self.ShipName, this, true);
			}
		},
		
		ForeignPopulate : function() {
			var details = Dom.get("shipsForeignDetails");
			
			if(details) {
				var ships = this.shipsForeign.ships,
					ul = document.createElement("ul"),
					li = document.createElement("li");
				
				ships = ships.slice(0);
				ships.sort(function(a,b) {
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
				
				Event.purgeElement(details);
				details.innerHTML = "";
				
				var serverTime = Lib.getTime(Game.ServerData.time);

				for(var i=0; i<ships.length; i++) {
					var ship = ships[i],
						nUl = ul.cloneNode(false),
						nLi = li.cloneNode(false),
						sec = (Lib.getTime(ship.date_arrives) - serverTime) / 1000;
						
					nUl.Ship = ship;
					Dom.addClass(nUl, "shipInfo");
					Dom.addClass(nUl, "clearafter");

					Dom.addClass(nLi,"shipTypeImage");
					Dom.setStyle(nLi, "background", ['transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center'].join(''));
					Dom.setStyle(nLi, "text-align", "center");
					nLi.innerHTML = ['<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" title="',ship.type_human,'" style="width:50px;height:50px;" />'].join('');
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipName");
					nLi.innerHTML = ship.name;
					nUl.appendChild(nLi);

					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipArrives");
					nLi.innerHTML = Lib.formatTime(sec);
					nUl.appendChild(nLi);
					
					nLi = li.cloneNode(false);
					Dom.addClass(nLi,"shipFrom");
					if(ship.from && ship.from.name) {
						if(ship.from.empire && ship.from.empire.name) {
							nLi.innerHTML = ship.from.name + ' <span style="cursor:pointer;">[' + ship.from.empire.name + ']</span>';
							Event.on(nLi, "click", this.EmpireProfile, ship.from.empire);
						}
						else {
							nLi.innerHTML = ship.from.name;
						}
					}
					else {
						nLi.innerHTML = 'Unknown';
					}
					nUl.appendChild(nLi);

					this.addQueue(sec, this.ForeignQueue, nUl);
								
					details.appendChild(nUl);
					
				}
				
				//wait for tab to display first
				setTimeout(function() {
					var Ht = Game.GetSize().h - 180;
					if(Ht > 300) { Ht = 300; }
					var tC = details.parentNode;
					Dom.setStyle(tC,"height",Ht + "px");
					Dom.setStyle(tC,"overflow-y","auto");
				},10);
			}
		},
		ForeignHandlePagination : function(newState) {
			Lacuna.Pulser.Show();
			this.service.view_foreign_ships({
				session_id:Game.GetSession(),
				building_id:this.building.id,
				page_number:newState.page
			}, {
				success : function(o){
					YAHOO.log(o, "info", "SpacePort.view_foreign_ships.success");
					Lacuna.Pulser.Hide();
					this.rpcSuccess(o);
					this.shipsForeign = {
						number_of_ships: o.result.number_of_ships,
						ships: o.result.ships
					};
					this.ForeignPopulate();
				},
				failure : function(o){
					YAHOO.log(o, "error", "SpacePort.view_foreign_ships.failure");
					Lacuna.Pulser.Hide();
					this.rpcFailure(o);
				},
				timeout:Game.Timeout,
				scope:this
			});
	 
			// Update the Paginator's state
			this.foreignPager.setState(newState);
		},
		ForeignQueue : function(remaining, elLine){
			var arrTime;
			if(remaining <= 0) {
				arrTime = 'Overdue ' + Lib.formatTime(Math.round(-remaining));
			}
			else {
				arrTime = Lib.formatTime(Math.round(remaining));
			}
			Sel.query("li.shipArrives",elLine,true).innerHTML = arrTime;
		},
		
		EmpireProfile : function(e, empire) {
			Lacuna.Info.Empire.Load(empire.id);
		},
		ShipScuttle : function(e) {
			if(confirm(["Are you sure you want to Scuttle ",this.Ship.name,"?"].join(''))) {
				var btn = Event.getTarget(e);
				btn.disabled = true;
				Lacuna.Pulser.Show();
				
				this.Self.service.scuttle_ship({
					session_id:Game.GetSession(),
					building_id:this.Self.building.id,
					ship_id:this.Ship.id
				}, {
					success : function(o){
						YAHOO.log(o, "info", "SpacePort.ShipScuttle.success");
						Lacuna.Pulser.Hide();
						this.Self.rpcSuccess(o);
						var ships = this.Self.shipsView.ships,
							info = Dom.get("shipsCount");
						for(var i=0; i<ships.length; i++) {
							if(ships[i].id == this.Ship.id) {
								ships.splice(i,1);
								break;
							}
						}
						if(info) {
							this.Self.result.docks_available++;
							info.innerHTML = ['This SpacePort can dock a maximum of ', this.Self.result.max_ships, ' ships. There are ', this.Self.result.docks_available, ' docks available.'].join(''); 
						}
						this.Line.parentNode.removeChild(this.Line);
					},
					failure : function(o){
						btn.disabled = false;
						YAHOO.log(o, "error", "SpacePort.ShipScuttle.failure");
						Lacuna.Pulser.Hide();
						this.Self.rpcFailure(o);
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
		},
		ShipRecall : function() {
			if(confirm(["Are you sure you want to Recall ",this.Ship.name,"?"].join(''))) {
				var btn = Event.getTarget(e);
				btn.disabled = true;
				Lacuna.Pulser.Show();
				
				this.Self.service.recall_ship({
					session_id:Game.GetSession(),
					building_id:this.Self.building.id,
					ship_id:this.Ship.id
				}, {
					success : function(o){
						Lacuna.Pulser.Hide();
						this.Self.rpcSuccess(o);
						
						var ships = this.Self.shipsView.ships,
							info = Dom.get("shipsCount");
						for(var i=0; i<ships.length; i++) {
							if(ships[i].id == this.Ship.id) {
								ships.splice(i,1);
								break;
							}
						}
						if(info) {
							this.Self.result.docks_available++;
							info.innerHTML = ['This SpacePort can dock a maximum of ', this.Self.result.max_ships, ' ships. There are ', this.Self.result.docks_available, ' docks available.'].join(''); 
						}
						//set to traveling
						Sel.query("li.shipTask", this.Line, true).innerHTML = "Travelling";
						//remove ships traveling so the tab gets reloaded when viewed next time
						delete this.Self.shipsTraveling;
					},
					failure : function(o){
						btn.disabled = false;
						Lacuna.Pulser.Hide();
						this.Self.rpcFailure(o);
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
		},
		
		GetShipsFor : function() {
			Lacuna.Pulser.Show();
			
			//Dom.setStyle("sendShipPick", "display", "none");
			Dom.setStyle("sendShipSend", "display", "none");
			
			var type = Lib.getSelectedOptionValue("sendShipType"),
				target = {};
			
			if(type == "xy") {
				target.x = Dom.get("sendShipTargetX").value;
				target.y = Dom.get("sendShipTargetY").value;
				Dom.get("sendShipNote").innerHTML = ['X: ', target.x, ' - Y: ', target.y].join('');
			}
			else {
				target[type] = Dom.get("sendShipTargetText").value;
				Dom.get("sendShipNote").innerHTML = target[type];
			}
			
			this.service.get_ships_for({
				session_id:Game.GetSession(),
				from_body_id:Game.GetCurrentPlanet().id,
				target:target
			}, {
				success : function(o){
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					this.PopulateShipsSendTab(target, o.result.available);
				},
				failure : function(o){
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
			
		},
		PopulateShipsSendTab : function(target, ships) {
			var details = Dom.get("sendShipAvail"),
				detailsParent = details.parentNode,
				li = document.createElement("li");
				
			Event.purgeElement(details); //clear any events before we remove
			details = detailsParent.removeChild(details); //remove from DOM to make this faster
			details.innerHTML = "";
			
			Dom.setStyle("sendShipSend", "display", "");
			
			if(ships.length === 0) {
				details.innerHTML = "No available ships to send.";
			}
			else {				
				for(var i=0; i<ships.length; i++) {
					var ship = ships[i],
						nLi = li.cloneNode(false);
						
					nLi.Ship = ship;
					nLi.innerHTML = ['<div class="yui-gd" style="margin-bottom:2px;">',
					'	<div class="yui-u first" style="width:15%;background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
					'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" style="width:60px;height:60px;" />',
					'	</div>',
					'	<div class="yui-u" style="width:67%">',
					'		<div class="buildingName">[',ship.type_human,'] ',ship.name,'</div>',
					'		<div><label style="font-weight:bold;">Details:</label>',
					'			<span>Task:<span>',ship.task,'</span></span>,',
					'			<span>Travel Time:<span>',Lib.formatTime(ship.estimated_travel_time),'</span></span>',
					'		</div>',
					'		<div><label style="font-weight:bold;">Attributes:</label>',
					'			<span>Speed:<span>',ship.speed,'</span></span>,',
					'			<span>Hold Size:<span>',ship.hold_size,'</span></span>,',
					'			<span>Stealth:<span>',ship.stealth,'</span></span>',
					'			<span>Combat:<span>',ship.combat,'</span></span>',
					'		</div>',
					'	</div>',
					'	<div class="yui-u" style="width:8%">',
					ship.task == "Docked" ? '		<button type="button">Send</button>' : '',
					'	</div>',
					'</div>'].join('');
					
					if(ship.task == "Docked") {
						Event.on(Sel.query("button", nLi, true), "click", this.ShipSend, {Self:this,Ship:ship,Target:target,Line:nLi}, true);
					}
					
					details.appendChild(nLi);
				}
			}
			detailsParent.appendChild(details); //add back as child
							
			//wait for tab to display first
			setTimeout(function() {
				var Ht = Game.GetSize().h - 250;
				if(Ht > 250) { Ht = 250; }
				Dom.setStyle(detailsParent,"height",Ht + "px");
				Dom.setStyle(detailsParent,"overflow-y","auto");
			},10);
		},
		ShipSend : function(e) {
			var btn = Event.getTarget(e);
			btn.disabled = true;
		
			var oSelf = this.Self,
				ship = this.Ship,
				target = this.Target;
			
			if(target && ship.id && Lacuna.MapStar.NotIsolationist(ship)) {
				Lacuna.Pulser.Show();
				oSelf.service.send_ship({
					session_id:Game.GetSession(),
					ship_id:ship.id,
					target:target
				}, {
					success : function(o){
						Lacuna.Pulser.Hide();
						this.Self.fireEvent("onMapRpc", o.result);
						this.Self.GetShipsFor();
						Event.purgeElement(this.Line);
						this.Line.innerHTML = "Successfully sent " + this.Ship.type_human + ".";
					},
					failure : function(o){
						Lacuna.Pulser.Hide();
						this.Self.fireEvent("onMapRpcFailed", o);
						btn.disabled = false;
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
			else {
				btn.disabled = false;
			}
		}
	});
	
	YAHOO.lacuna.buildings.SpacePort = SpacePort;

})();
YAHOO.register("spaceport", YAHOO.lacuna.buildings.SpacePort, {version: "1", build: "0"}); 

}
