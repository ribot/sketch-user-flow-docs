// @import 'libs/sandbox.js';
@import 'libs/constants.js';
@import 'libs/utils.js';

// Globals
var key = new RegExp( USER_FLOW_METADATA_LAYER_NAME );
var doc;

// onRun handler
function toggleUserFlowMetadata( context ) {
	doc = context.document;
	print( doc )

	toggleVisibilityAllLayers( doc.currentPage().layers().array() )
}

// Traverses layer tree and toggles visibility of all layers where name matches key
function toggleVisibilityAllLayers( layers ) {
	print( layers )
    processAllLayers( layers, function( layer ) {
        if ( key.test( layer.name() ) ) {
            layer.setIsVisible( !layer.isVisible() )
        }
    } )
}
