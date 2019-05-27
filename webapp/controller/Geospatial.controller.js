sap.ui.define([
	"sap/ui/core/mvc/Controller",
   "sap/ui/vbm/AnalyticMap",
   "sap/ui/model/json/JSONModel",
   "sap/ui/Device",
   "sap/base/Log"
   ],
	function(Controller, AnalyticMap,JSONModel, Device, Log) {
	"use strict";

	return Controller.extend("opensap.pole.controller.Geospatial", {
	
		onInit : function () 
		{
			var oModel = this.getOwnerComponent().getModel("geoData");
			this.getView().setModel(oModel);
		    
		 // set the device model
			var oDeviceModel = new JSONModel(Device);
			oDeviceModel.setDefaultBindingMode("OneWay");
			this.getView().setModel(oDeviceModel, "device");
		 },
		 
		 onPressLegend: function ()	{
			 if(this.byId("vbi").getLegendVisible()===true){
				 this.byId("vbi").setLegendVisible(false);
				 this.byId("btnLegend").setTooltip("Show legend");
			 }
			 else{
				 this.byId("vbi").setLegendVisible(true);
				 this.byId("btnLegend").setTooltip("Hide legend");
			 }
		},

		onPressResize: function ()	{
			if(this.byId("btnResize").getTooltip()==="Minimize"){
				if (sap.ui.Device.system.phone) {
					this.byId("vbi").minimize(132,56,1320,560);//Height: 3,5 rem; Width: 8,25 rem
				} else {
					this.byId("vbi").minimize(168,72,1680,720);//Height: 4,5 rem; Width: 10,5 rem
				}				
				this.byId("btnResize").setTooltip("Maximize");
			}
			else{
				this.byId("vbi").maximize();
				this.byId("btnResize").setTooltip("Minimize");
			}
		},

		onRegionClick: function (e)
		{
			sap.m.MessageToast.show( "onRegionClick " + e.getParameter( "code" ) );
		},

		onRegionContextMenu: function ( e )
		{
			sap.m.MessageToast.show( "onRegionContextMenu " + e.getParameter( "code" ) );
		},
	
		onClickItem: function (evt)	{
			Log.info("onClick");
		},

		onContextMenuItem: function ( evt )	{
			Log.info("onContextMenu");
		},
	
		onClickCircle: function (evt)	{
			Log.info("Circle onClick");
		},

		onContextMenuCircle: function ( evt )	{
			Log.info("Circle onContextMenu");
		}
	});


}, /* bExport= */ true);