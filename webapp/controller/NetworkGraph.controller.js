sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
    "sap/m/Button",
    "sap/m/ButtonType",
    "sap/m/Dialog",
    "sap/base/Log",
    "sap/m/MessageToast",
    "sap/m/DateTimePicker",
    "sap/ui/core/Item",
	"sap/suite/ui/commons/networkgraph/Node",
    "sap/suite/ui/commons/networkgraph/Line",
    "sap/suite/ui/commons/networkgraph/Group",
    "sap/suite/ui/commons/networkgraph/ActionButton",
    "sap/suite/ui/commons/networkgraph/layout/LayoutAlgorithm",
    "sap/suite/ui/commons/networkgraph/layout/ForceBasedLayout",
    "sap/suite/ui/commons/networkgraph/layout/ForceDirectedLayout",
    "sap/suite/ui/commons/networkgraph/layout/LayeredLayout"
], function (Controller, JSONModel, Button, ButtonType, Dialog, Log, MessageToast,
			DateTimePicker, Item, Node, Line, Group, ActionButton,
			LayoutAlgorithm, ForceBasedLayout, ForceDirectedLayout, LayeredLayout) {
	"use strict";

	var NetworkGraphController = Controller.extend("opensap.pole.controller.NetworkGraph", {

		onInit: function () {
			
			//Get the base model defined by netgraph
			var oModel = this.getOwnerComponent().getModel("netgraph");
			oModel.setSizeLimit(50000);
			sap.ui.getCore().setModel(oModel, "CurrentGraph");
			this.getView().setModel(sap.ui.getCore().getModel("CurrentGraph"));
			//Set up the client side model to track state of the Graph
			var Canvas = new JSONModel({
				graphs: [oModel],
				layout: "ForceBasedLayout",
				current: 1,
				nodeKeys: [],
				groupKeys: []
			});
			//Fill the keys for Nodes and Groups
			//This is done in the create node dialog as well. Need to figure better way
			for(var n in oModel.getData().nodes){
				Canvas.getData().nodeKeys.push(n);
			}
			for(var g in oModel.getData().groups){
				Canvas.getData().groupKeys.push(g);
			}
			//Set the model
			sap.ui.getCore().setModel(Canvas, "Canvas");
			//Settings for the graph
			this.oModelSettings = new JSONModel({
				maxIterations: 200,
				maxTime: 500,
				initialTemperature: 200,
				coolDownStep: 1
			});
			this.getView().setModel(this.oModelSettings, "settings");

			this.oGraph = this.byId("graph");
			this.oGraph._fZoomLevel = 0.75;
			this.graphToolbar = this.oGraph.getToolbar();
			//Refresh Button
			this.graphToolbar.insertContent(new Button("refreshButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://switch-views",
				tooltip: "{i18n>switchLayout}",
				press: this.switchViews.bind(this.oGraph)
			}), 0);
			this.graphToolbar.insertContent(new Button("addNodeButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://sys-add",
				tooltip: "{i18n>addNode}",
				press: this.openAddNodeDialog.bind(this.oGraph)
			}), 1);
			this.graphToolbar.insertContent(new Button("addEdgeButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://share-2",
				tooltip: "{i18n>addEdge}",
				press: this.openAddEdgeDialog.bind(this.oGraph)
			}), 2);
			this.graphToolbar.insertContent(new Button("saveGraphButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://save",
				tooltip: "{i18n>saveGraph}",
				press: this.saveGraph.bind(this.oGraph)
			}), 3);
			this.graphToolbar.insertContent(new Button("PreviousGraphButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://nav-back",
				tooltip: "{i18n>previousSavedGraph}",
				press: this.previousGraph.bind(this.oGraph)
			}), 4);
			this.graphToolbar.insertContent(new Button("NextGraphButton", {
				type: ButtonType.Transparent,
				icon: "sap-icon://navigation-right-arrow",
				tooltip: "{i18n>nextSavedGraph}",
				press: this.nextGraph.bind(this.oGraph)
			}), 5);
		},
		
		addEdge: function(oEvent){
			var bNodes = this.setSelectedNode(oEvent);
			var popUp = new sap.m.ResponsivePopover("nodePopUp", {
        		title: "Create relation",
        		content: new sap.ui.layout.form.SimpleForm("addEdgePopup", {
        			content:
                    [
                        new sap.m.Label({
                            text:"Available nodes"
                            }),
                        new sap.m.Select({
                            id: "bNode",
                            items: {
                                path: "/",
                                sorter: {
                                    path: "{title}"
                                    },
                                template: new Item({
                                    text: "{title}",
                                    key: "{key}"
                                    })
                                }
                            }),
                        new sap.m.Label({
                            text:"Relationship type"
                            }),
                        new sap.m.Input({
                            id: "rType"
                            }),
                        new sap.m.Switch({
                            id: "rDirection",
                            customTextOn: "Out",
                            customTextOff: "In"
                        })
                    ]
        		}),
        		beginButton : new Button({
        			text: "Create",
        			press: function(){
        				var bNode = sap.ui.getCore().byId("bNode").getSelectedKey();
        				var aNode = sap.ui.getCore().getModel("selectedNode").getData().key;
        				if(sap.ui.getCore().byId("rDirection").getState() === false){
        					var from = bNode;
        					var to = aNode;
        				} else {
        					from = aNode;
        					to = bNode;
        				}
        				
            			var oLine = new Line({
            				"from" : from,
            				"to" : to
            			});
            			//rtype would make an illegal insertion but is needed for 
				    	sap.ui.getCore().byId("__xmlview0--graph").addLine(oLine);
				    	var sMessage = new sap.m.Text({text: "Adding new edge from id " + from + " to id " + to});
            			MessageToast.show(sMessage.getText());
            			sap.ui.getCore().byId("nodePopUp").close();
        			}
        		}),
        		afterClose: function(){
    				sap.ui.getCore().byId("nodePopUp").destroy();
        		}
        	});
        	popUp.setModel(bNodes);
        	oEvent.getSource().addDependent(popUp);
        	popUp.openBy(oEvent.getSource().getParent());
		},
		
		mergeNodes: function(oEvent){
			var bNodes = this.setSelectedNode(oEvent);
    		var popUp = new sap.m.ResponsivePopover("nodePopUp", {
	    		title: "Merge nodes",
	    		content: new sap.ui.layout.form.SimpleForm({
	    			content:
	                [
	                    new sap.m.Label({
	                        text:"Available nodes"
	                        }),
	                    new sap.m.Select({
	                        id: "bNodeKey_from_node",
	                        items: {
	                            path: "/",
	                            sorter: {
	                                path: "{title}"
	                                },
	                            template: new Item({
	                                text: "{title}",
	                                key: "{key}"
	                                })
	                            }
	                        })
	                ]
	    		}),
	    		beginButton : new Button({text: "Merge"}),
	    		afterClose: function(){
					sap.ui.getCore().byId("nodePopUp").destroy();
	    		}
    		});
        	popUp.setModel(bNodes);
        	oEvent.getSource().addDependent(popUp);
        	popUp.openBy(oEvent.getSource().getParent());
		},
		
		traverseFromNode: function(oEvent){
			var bNodes = this.setSelectedNode(oEvent);
        	var popUp = new sap.m.ResponsivePopover("nodePopUp", {
        		title: "Traverse from Node",
        		content: new sap.ui.layout.form.SimpleForm({
        			content:
                    [
                    	new sap.m.Label({
                            text:"Edge filters"
                            }),
                        new sap.m.Input({
                            id: "edgeFilters"
                            }),
                    	new sap.m.Label({
                            text:"Link depth"
                            }),
                        new sap.m.Slider({
                            id: "edgeDegrees",
                            min: 0,
                            max: 10,
                            showAdvancedTooltip: true
                        })
                    ]
        		}),
        		beginButton : new Button({text: "Start"}),
        		afterClose: function(){
    				sap.ui.getCore().byId("nodePopUp").destroy();
        		}
        	});
        	popUp.setModel(bNodes);
        	oEvent.getSource().addDependent(popUp);
        	popUp.openBy(oEvent.getSource().getParent());

		},
		
		getShortestPath: function(oEvent){
			var bNodes = this.setSelectedNode(oEvent);
        	var popUp = new sap.m.ResponsivePopover("nodePopUp", {
	    		title: "Shortest Path",
	    		content: new sap.ui.layout.form.SimpleForm({
	    			content:
	                [
	                	new sap.m.Label({
	                        text:"Available nodes"
	                        }),
	                    new sap.m.Select({
	                        id: "bNodeKey_from_node",
	                        items: {
	                            path: "/",
	                            sorter: {
	                                path: "{title}"
	                                },
	                            template: new Item({
	                                text: "{title}",
	                                key: "{key}"
	                                })
	                            }
	                        })
	                ]
	    		}),
	    		beginButton : new Button({text: "Start"}),
	    		afterClose: function(){
					sap.ui.getCore().byId("nodePopUp").destroy();
	    		}
	    	});
        	popUp.setModel(bNodes);
        	oEvent.getSource().addDependent(popUp);
        	popUp.openBy(oEvent.getSource().getParent());
		},
		
		updateNode: function(oEvent){
			var bNodes = this.setSelectedNode(oEvent);
			var cur = sap.ui.getCore().getModel("Canvas").getData().current - 1;
            var Fields = [];
            for(var n in bNodes.getData()){
                if(bNodes.getData()[n].key === sap.ui.getCore().getModel("selectedNode").getData().key){
                    if(bNodes.getData()[n].hasOwnProperty("title")){
                        Fields.push(new sap.m.Label({text: "Title"}));
                        Fields.push(new sap.m.Input({placeholder: bNodes.getData()[n].title}));
                    }
                    if(bNodes.getData()[n].hasOwnProperty("attributes")){
                        for(var j=0; j < bNodes.getData()[n].attributes.length; j++){
                        	if(bNodes.getData()[n].attributes[j].label !== "class_name"){
                                Fields.push(new sap.m.Label({text: bNodes.getData()[n].attributes[j].label}));
                                Fields.push(new sap.m.Input({placeholder: bNodes.getData()[n].attributes[j].value}));
                        	}
                        }
                    }
                    if(bNodes.getData()[n].hasOwnProperty("icon")){
                        Fields.push(new sap.m.Label({text: "Icon"}));
                        Fields.push(new sap.m.Input({placeholder: bNodes.getData()[n].icon}));
                    }
                    if(bNodes.getData()[n].hasOwnProperty("status")){
                        Fields.push(new sap.m.Label({text: "Status"}));
                        Fields.push(new sap.m.Input({placeholder: bNodes.getData()[n].status}));
                    }
                    if(bNodes.getData()[n].hasOwnProperty("group")){
                        Fields.push(new sap.m.Label({text: "Group"}));
                        Fields.push(new sap.m.Input({placeholder: bNodes.getData()[n].group}));
                    }
                }
            }
			//Set popup with beginButton containing the update process and endButton the delete
        	var popUp = new sap.m.ResponsivePopover("nodePopUp", {
        		title: "Update Node",
        		content: new sap.ui.layout.form.SimpleForm("formUpdateNode", {
					content: [Fields]
        		}),
        		beginButton : new Button({
        			text: "Update",
        			press: function(){
        				//Update a node based on the form and array which will hold the updated values
        				var formContent = sap.ui.getCore().byId("formUpdateNode").getContent();
        				var toUpdate = [];
        				for(var i in formContent){
        					//Labels come before inputs so create the update shell and then...
        					if(formContent[i].getId().includes("label")){
        						var update = {"label": formContent[i].getText()};
        					}
        					//...if there is a value in the input, push the update for further use
    						else if(formContent[i].getId().includes("input")){
    							if(formContent[i].getValue() !== ""){
    								update.value = formContent[i].getValue();
    								toUpdate.push(update);
    							}
        					}
        				}
        				//Set up the oData for future use to jQuery update back end
        				
        				var updateData = ({
        					"nodeKey": sap.ui.getCore().getModel("selectedNode").getData().key,
        					"toUpdate": toUpdate,
        					"curGraph": sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData()
        				});
        				Log.info(updateData);
        				//UP
        				//Given the list of nodes in this graph, find the node that needs to be updated
        				for(i in bNodes.getData()){
        					//This is the one to update
							if(sap.ui.getCore().getModel("selectedNode").getData().key == bNodes.getData()[i].key){
								//Given the updates, check the nodes labels and if they match the updated labels, update the values
								for(var u in toUpdate){
									//Only 3 values are not contained within the attributes
									if(toUpdate[u].label === "Title" || toUpdate[u].label === "class_name" || toUpdate[u].label === "Icon"){
										bNodes.getData()[i][toUpdate[u].label.toLowerCase()] = toUpdate[u].value;
									}
									else {
										for(var a in bNodes.getData()[i].attributes){
											if(bNodes.getData()[i].attributes[a].label === toUpdate[u].label){
												bNodes.getData()[i].attributes[a].value = toUpdate[u].value;
											}
						                }
									}	
								}
								//Update the virtual canvas graph and the actual visible graph, then refresh the model for the visible graph
			                    var selectedNode = new JSONModel({
			                    	"key": bNodes.getData()[i].key,
			                    	"title": bNodes.getData()[i].title,
			                    	"icon": bNodes.getData()[i].icon,
			                    	"attributes": bNodes.getData()[i].attributes
			                    });
			                    sap.ui.getCore().setModel(selectedNode, "selectedNode");
								for(n in sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes){
				                	if(sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes[n].key == updateData.nodeKey){
				                		sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes[n] = bNodes.getData()[i];
				                		sap.ui.getCore().getModel("CurrentGraph").getData().nodes[n] = bNodes.getData()[i];
				                		sap.ui.getCore().getModel("CurrentGraph").refresh();
				                	}
				                }
				                MessageToast.show("Node " + sap.ui.getCore().getModel("selectedNode").getData().title + " updated");
				                sap.ui.getCore().byId("nodePopUp").close();
								break;
							}
						}
        			}
        		}),
        		endButton : new Button({
        			text: "Delete",
        			type: "Reject",
        			press: function () {
        				//Get the model to update several parts
        				var oModel = sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData();
        				
        				//Get the node key and title for the message before the node is deleted 
        				var nodeKey = sap.ui.getCore().getModel("selectedNode").getData().key;
        				var nodeTitle= sap.ui.getCore().getModel("selectedNode").getData().title;
        				//Delete the node from the virtual and visible graph
						for(n in oModel.nodes){
		                	if(oModel.nodes[n].key == nodeKey){	
		                		oModel.nodes.splice(n, 1);
		                	}
		                }
        				//Delete the lines where the node existed
        				for(n in oModel.lines){
        					if(oModel.lines[n].to == nodeKey || oModel.lines[n].from == nodeKey){
        						oModel.lines.splice(n, 1);
        					}

        				}
        				//Update the models
        				sap.ui.getCore().setModel(new JSONModel(oModel), "CurrentGraph");
        				sap.ui.getCore().getModel("Canvas").getData().graphs[cur] = new JSONModel(oModel);
        				sap.ui.getCore().byId("nodePopUp").getParent().getParent().getParent().setModel(new JSONModel(oModel));
        				MessageToast.show("Node " + nodeTitle + " deleted");
        			}
        		}),
        		afterClose: function(){
    				sap.ui.getCore().byId("nodePopUp").destroy();
        		}
        	});
        	popUp.setModel(bNodes);
        	oEvent.getSource().addDependent(popUp);
        	popUp.openBy(oEvent.getSource().getParent());
			
		},
		
		setSelectedNode: function(oEvent){
            var NodeKey = Number(oEvent.getSource().getParent().getKey());
            var NodeTitle = oEvent.getSource().getParent().getTitle();
            var NodeAttributes = oEvent.getSource().getParent().getAttributes();
            var formattedNodeAttributes = [];
            for(var i in NodeAttributes){
            	formattedNodeAttributes.push({
            		"label": NodeAttributes[i].getLabel(),
            		"value": NodeAttributes[i].getValue()
            	});
            }
            var NodeIcon = oEvent.getSource().getParent().getIcon();
            var selectedNode = new JSONModel({
            	"key": NodeKey,
            	"title": NodeTitle,
            	"icon": NodeIcon,
            	"attributes": formattedNodeAttributes
            });
            sap.ui.getCore().setModel(selectedNode, "selectedNode");
			// Get the current graph's nodes to draw relations to (TODO Get federated nodes)	
			var cur = sap.ui.getCore().getModel("Canvas").getData().current - 1;
			// Set the nodes as a model variable to assign to each Action button as needed
			var bNodes = new JSONModel(sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes);
			return bNodes;
					                    
		},
		
		//TOOLBAR Functions
		switchViews: function () {
			var layout = sap.ui.getCore().getModel("Canvas").getData().layout;
			if(layout === "ForceDirectedLayout"){
				this.setLayoutAlgorithm(new LayeredLayout());
				sap.ui.getCore().getModel("Canvas").setProperty("/layout", "LayeredLayout");
				MessageToast.show("Layered Layout");
			} else if(layout === "LayeredLayout"){
				this.setLayoutAlgorithm(new ForceBasedLayout());
				sap.ui.getCore().getModel("Canvas").setProperty("/layout", "ForceBasedLayout");
				MessageToast.show("Force Based Layout}");
			} else {
				this.setLayoutAlgorithm(new ForceDirectedLayout());
				sap.ui.getCore().getModel("Canvas").setProperty("/layout", "ForceDirectedLayout");
				MessageToast.show("Force Directed Layout");
			}
			
		},
		
		nextGraph: function(){
			if(sap.ui.getCore().getModel("Canvas").getData().current === sap.ui.getCore().getModel("Canvas").getData().graphs.length){
				MessageToast.show("End of index");
			} else {
				
				sap.ui.getCore().getModel("Canvas").getData().current++;
				var oModel = new JSONModel(sap.ui.getCore().getModel("Canvas").getData().graphs[sap.ui.getCore().getModel("Canvas").getData().current - 1].getData());
				oModel = sap.ui.controller("opensap.pole.controller.NetworkGraph").checkGraphConsistency(oModel);
				this.getParent().getParent().byId("graph").destroyAllElements();
				this.getParent().getParent().byId("graph").setModel(oModel);
								MessageToast.show(
					"Showing " + sap.ui.getCore().getModel("Canvas").getData().current +
					" of " + sap.ui.getCore().getModel("Canvas").getData().graphs.length + " graphs");
			}
		},
		
		previousGraph: function(){
			if(sap.ui.getCore().getModel("Canvas").getData().current === 1){
				MessageToast.show("End of index");
			} else {
				sap.ui.getCore().getModel("Canvas").getData().current--;
				var oModel = new JSONModel(sap.ui.getCore().getModel("Canvas").getData().graphs[sap.ui.getCore().getModel("Canvas").getData().current - 1].getData());
				oModel = sap.ui.controller("opensap.pole.controller.NetworkGraph").checkGraphConsistency(oModel);
				this.getParent().getParent().byId("graph").destroyAllElements();
				this.getParent().getParent().byId("graph").setModel(oModel);
				MessageToast.show(
					"Showing " + sap.ui.getCore().getModel("Canvas").getData().current +
					" of " + sap.ui.getCore().getModel("Canvas").getData().graphs.length + " graphs");
			}
			
		},
		
		saveGraph: function() {
			var oModel = new JSONModel($.extend(true, {}, this.getParent().getParent().getModel().getData()));
			var cur = sap.ui.getCore().getModel("Canvas").getData().current - 1;
			sap.ui.getCore().getModel("Canvas").getData().graphs.push(oModel);
			sap.ui.getCore().getModel("Canvas").getData().current++;
			sap.ui.getCore().byId("__xmlview0--graph").setModel(sap.ui.getCore().getModel("Canvas").getData().graphs[cur]);
			MessageToast.show("Saved Graph " + (sap.ui.getCore().getModel("Canvas").getData().current));
			
		},
		
		checkGraphConsistency: function(oModel) {
			
			var nodeKeys = [];
			var groupKeys = [];
			var nModel = {"nodes": [], "groups": [], "lines": []};
			// Remove duplicate nodes
			for(var n in oModel.getData().nodes){
				if(!nodeKeys.includes(oModel.getData().nodes[n].key)){
					nodeKeys.push(oModel.getData().nodes[n].key);
					nModel.nodes.push(oModel.getData().nodes[n]);
					if(!groupKeys.includes(oModel.getData().nodes[n].group)){
						groupKeys.push(oModel.getData().nodes[n].group);
					}
				}
			}
			// Only push lines that have both to and from with existing nodes
			for(n in oModel.getData().lines){
				if(nodeKeys.includes(oModel.getData().lines[n].from) && nodeKeys.includes(oModel.getData().lines[n].to)){
					nModel.nodes.push(oModel.getData().lines[n]);
				}
			}
			return new JSONModel(oModel);
		},
		
		openAddNodeDialog : function (oPress) {
			//Quality check on current graph state
			var oNodes = this.getParent().getParent().getModel().getData().nodes;
			var oNodeKeys = [];
			for(var n in oNodes){
				oNodeKeys.push(oNodes[n].key);
			}
			var oGroups = this.getParent().getParent().getModel().getData().groups;
			var oGroupKeys = [];
			for(n in oGroups){
				oGroupKeys.push(oGroups[n].key);
			}
			sap.ui.getCore().getModel("Canvas").getData().nodeKeys = oNodeKeys;
			sap.ui.getCore().getModel("Canvas").getData().groupKeys = oGroupKeys;
			var pCount = 0;
	         if (!this.addNodeDialog) {
	            this.addNodeDialog = new Dialog("AddNodeDialog", {
	            	title: "{i18n>addNode}",
	            	beginButton: new Button({
	            		text: "{i18n>add}",
	            		press: function (oEvent) {
			                
			                var oData = ({
                                "title": "",
                                "status": "",
                                "icon": "",
                                "key": Math.max.apply(null, sap.ui.getCore().getModel("Canvas").getData().nodeKeys) + 1,
                                "attributes": []});
	            			sap.ui.getCore().getModel("Canvas").getData().nodeKeys.push(oData.key);
	            			var inputs = oEvent.getSource().getParent().getContent()[0]._aElements;
		                    for(var p in inputs){
		                        if(inputs[p].getId().slice(0,5) === "label"){
		                            if(inputs[p].getId() === "labelDob"){
		                                oData.attributes.push({"label": "DateOfBirth", "value": inputs[p].getProperty("value")});
		                            } 
		                            else if (inputs[p].getId()=== "labelDoe") {
		                                oData.attributes.push({"label": "CreateDate", "value": inputs[p].getProperty("value")});
		                            } 
		                            else if (inputs[p].getId() === "labelGender") {
		                                oData.attributes.push({"label": "Gender", "value": inputs[p].getProperty("value")});
		                            } 
		                            else if (inputs[p].getId() === "labelFName") {
		                                oData.attributes.push({"label": "FirstName", "value": inputs[p].getProperty("value")});
		                                oData.title = inputs[p].getProperty("value");
		                            } 
		                            else if (inputs[p].getId() === "labelLat") {
		                                oData.attributes.push({"label": "Latitude", "value": inputs[p].getProperty("value")});
		                            } 
		                            else if (inputs[p].getId() === "labelLon") {
		                                oData.attributes.push({"label": "Longitude", "value": inputs[p].getProperty("value")});
		                            } 
		                            else if (inputs[p].getId() === "labelType") {
		                                oData.attributes.push({"label": "Category", "value": inputs[p].getProperty("value")});
		                            } 
		                            else {
		                                if (inputs[p].getProperty("placeholder") === "Property"){
		                                    var property = {"label": inputs[p].getProperty("value")};
		                                }
		                                else {
		                                	property.value = inputs[p].getProperty("value");
		                                	oData.attributes.push(property);
		                                }
		                            }
		                        } 
		                        else if(inputs[p].getId().slice(0,7) === "__label"){
		                            property = {"label": "class_name"};
		                        } 
		                        else if(inputs[p].getId() === "nodeType"){
		                            property.value = inputs[p].getProperty("selectedKey");
		                            oData.attributes.push(property);
		                            oData.nodeType = inputs[p].getProperty("selectedKey");
		                        } 
		                        else if(inputs[p].getId().slice(0,5) === "value") {
		                            property.value = inputs[p].getProperty("value");
		                            oData.attributes.push(property);
                        			if(property.label.toUpperCase().replace(/\s/g, "") === "LASTNAME"){
                                		oData.title = oData.title + " " + property.value;
                                	}
                                	else if(property.label.toUpperCase().replace(/\s/g, "") === "ICON") {
                                		oData.icon = property.value;
                                	}
		                        }
		                    }
	            			// Quality check on Title
	            			if(oData.title === ""){
	            				var titleLength = 0;
	            				for(var prop in oData.attributes){
	            					oData.title = oData.title + " " + oData.attributes[prop].value;
	            					if(titleLength === 3){
	            						break;
	            					}
	            					else {
	            						titleLength++;
            						}
	            				}
	            			}
	            			// Quality check on Icon
	            			if(oData.icon === ""){
	            				if(oData.nodeType === "Person") {
	            					oData.icon = "sap-icon://person-placeholder";
	            				}
	            				else if(oData.nodeType === "Object") {
		            				oData.icon = "sap-icon://add-product";
	            				}
	            				else if(oData.nodeType === "Location") {
	            					oData.icon = "sap-icon://map";
	            				}
	            				else if(oData.nodeType === "Event") {
	            					oData.icon = "sap-icon://date-time";
	            				}
	            				else {
	            					oData.icon = "sap-icon://folder-blank";
	            				}
	            			}
	            			// Quality check on group
	            			/*
	            			if(sap.ui.getCore().getModel("Canvas").getData().groupKeys.includes(oData.group)){
	            				Log.info("Group in index");
	            			}
	            			else{
	            				sap.ui.getCore().byId("__xmlview0--graph").addGroup(
	            					new Group({
	            						key: oData.group,
	            						title: oData.group
	            					}));
	            			}
	            			*/
	            			// Quality check on build process
	            			if(typeof(oData) === "string"){
	            				MessageToast.show("No information for new Node");
	            			}
	            			// Create the Node with no buttons and add the custom action buttons
	            			else { 
	            				MessageToast.show("Adding new node");
	            				var raw = ({
	        						key: oData.key,
	        						title: oData.title,
	        						icon: oData.icon,
	        						attributes: oData.attributes,
	        						showExpandButton: false,
	        						showActionLinksButton: false,
	        						actionButtons: [
	        							new ActionButton({
											icon: "sap-icon://edit",
						                	title: "Update attributes",
						                	press: sap.ui.controller("opensap.pole.controller.NetworkGraph").updateNode,
						                	position: "Left"
	        							}),
	        							new ActionButton({
											icon: "sap-icon://share-2",
						                	title: "Add edge",
						                	press: sap.ui.controller("opensap.pole.controller.NetworkGraph").addEdge,
						                	position: "Left"
	        							}),
	        							new ActionButton({
											icon: "sap-icon://combine",
						                	title: "Merge nodes",
						                	press: sap.ui.controller("opensap.pole.controller.NetworkGraph").mergeNodes,
						                	position: "Left"
	        							}),
	        							new ActionButton({
											icon: "sap-icon://map-3",
						                	title: "Shortest Path",
						                	press: sap.ui.controller("opensap.pole.controller.NetworkGraph").getShortestPath
	        							}),
	        							new ActionButton({
											icon: "sap-icon://overview-chart",
						                	title: "Traverse from Node",
						                	press: sap.ui.controller("opensap.pole.controller.NetworkGraph").traverseFromNode
	        							})]
	            					});
	            				var oNode = new Node(raw);
	            				var cur = sap.ui.getCore().getModel("Canvas").getData().current - 1;
	            				// Get the current graph's nodes to draw relations to (TODO Get federated nodes)	
	            				// Special check for deployed version where the model is not bound during init. (TODO fix loading from init)
	            				if(sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes === undefined){
									var oModel = new sap.ui.model.json.JSONModel(this.getParent().getParent().getParent().getParent().getModel().getData());
									oModel.setSizeLimit(50000);
									sap.ui.getCore().getModel("Canvas").getData().graphs[cur] = oModel;
								}
	            				sap.ui.getCore().getModel("Canvas").getData().graphs[cur].getData().nodes.push(raw);
	            				sap.ui.getCore().byId("__xmlview0--graph").addNode(oNode);
	            				sap.ui.getCore().byId("__xmlview0--graph").setModel(sap.ui.getCore().getModel("Canvas").getData().graphs[cur]);
	            				sap.ui.getCore().byId("__xmlview0").addDependent(oNode);
	            			}
	            			this.getParent().close();
	            		}
	            	}),
					endButton: new Button({
						text: "{i18n>cancel}",
						press: function () {
							this.getParent().close();
						}
					}),
	            	afterClose: function() { 
	            		this.destroyContent();
	            	}
            	});
        	}
        	this.addNodeDialog.addContent(
	         	new sap.ui.layout.form.SimpleForm("AddNodeForm", {
	         		content:
            		[
        				new sap.m.Label({
                            text:"{i18n>nodeClass}"
                            }),
                        new sap.m.Select({
                            id: "nodeType",
                            change: function(oEvent){
                                //Clear all customizing fields
                                var fields = this.getParent().getFields();
                                for(var f in fields){
                                    if(fields[f].getId() !== "nodeType"){
                                        if(fields[f].getId().includes("button") === false){
                                            sap.ui.getCore().byId(fields[f].getId()).destroy();
                                        }
                                    }
                                }
                        		var selectedKey = oEvent.getSource().getSelectedKey();
                                if(selectedKey === "Person"){
                                    this.getParent().addField(new sap.m.Input("labelGender", { placeholder: "{i18n>nodeGender}"}));
                                    this.getParent().addField(new sap.m.Input("labelFName",{ placeholder: "{i18n>nodeName}"}));
                                    this.getParent().addField(new DateTimePicker("labelDob"),{ valueFormat: "yyyy-MM-dd HH:mm:ss"});
                                    pCount++;
                                }else if (selectedKey === "Object"){
                                    this.getParent().addField(new sap.m.Input("labelType",{ placeholder: "{i18n>category}"}));
                                    pCount++;
                                }else if (selectedKey === "Location"){
                                    this.getParent().addField(new sap.m.Input("labelLat",{ placeholder: "{i18n>latitude}"}));
                                    this.getParent().addField(new sap.m.Input("labelLon",{ placeholder: "{i18n>longitude}"}));
                                    pCount++;
                                }else if (selectedKey === "Event"){
                                    this.getParent().addField(new DateTimePicker("labelDoe"),{ valueFormat: "yyyy-MM-dd HH:mm:ss"});
                                    pCount++;
                                }else{
                                    this.getParent();
                                }
                            },
                            items: [
                                new sap.ui.core.Item(
                                        {text: "None", key: "None"}),
                                new sap.ui.core.Item(
                                        {text: "Person", key: "Person"}),
                                new sap.ui.core.Item(
                                        {text: "Object", key: "Object"}),
                                new sap.ui.core.Item(
                                        {text: "Location", key: "Location"}),
                                new sap.ui.core.Item(
                                        {text: "Event", key: "Event"})
                                ]
                            }),
                        new sap.m.Button({
                            icon : "sap-icon://add",
                            text : "{i18n>addProperty}",
                            press : function() {
                                  this.getParent().addField(new sap.m.Input("label" + pCount,{ placeholder: "Property"}));
                                  this.getParent().addField(new sap.m.Input("value" + pCount,{ placeholder: "{i18n>labelValue}"}));
                                  pCount++;
                            }
                        })
                    ]
			}));
    		this.addDependent(this.addNodeDialog);
        	this.addNodeDialog.open();
    	},
    	
		openAddEdgeDialog : function () {
			
	         if (!this.addEdgeDialog) {
	            this.addEdgeDialog = new Dialog("addEdgeDialog", {
	            	title: "{i18n>addEdge}",
	            	beginButton: new Button({
	            		text: "{i18n>add}",
	            		press: function (oEvent) {
	            			var oLine = new Line({
	            				"from" : sap.ui.getCore().byId("aNode").getSelectedKey(),
	            				"to" : sap.ui.getCore().byId("bNode").getSelectedKey()
	            			});
	            			//rtype would make an illegal insertion but is needed for 
    				    	sap.ui.getCore().byId("__xmlview0--graph").addLine(oLine);
    				    	var sMessage = new sap.m.Text({text: "Adding new edge"});
	            			MessageToast.show(sMessage.getText());
	            			this.getParent().close();
	            		}
	            	}),
					endButton: new Button({
						text: "{i18n>cancel}",
						press: function () {
							this.getParent().close();
						}
					}),
	            	afterClose: function() { 
	            		this.destroyContent();
	            	}
	            });
	         }
	         this.addEdgeDialog.addContent(
	         	new sap.ui.layout.form.SimpleForm({
                    content:
                        [
                            new sap.m.Label({
                                text:"Source node"
                                }),
                            new sap.m.Select({
                                id: "aNode",
                                items: {
                                    path: "/nodes",
                                    sorter: {
                                        path: "{title}"
                                        },
                                    template: new Item({
                                        text: "{title}",
                                        key: "{key}"
                                        })
                                    }
                                }),
                            new sap.m.Label({
                                text:"Target node"
                                }),
                            new sap.m.Select({
                                id: "bNode",
                                items: {
                                    path: "/nodes",
                                    sorter: {
                                        path: "{title}"
                                        },
                                    template: new Item({
                                        text: "{title}",
                                        key: "{key}"
                                        })
                                    }
                                }),
                            new sap.m.Label({
                                text:"Relationship type"
                                }),
                            new sap.m.Input({
                                id: "rType"
                                })
                        ]

                })
	         	);
	         this.addDependent(this.addEdgeDialog);
	         this.addEdgeDialog.open();
    	}
	});
	return NetworkGraphController;
});