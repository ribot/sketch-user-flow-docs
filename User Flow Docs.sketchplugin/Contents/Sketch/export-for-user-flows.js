@import 'libs/sandbox.js';
@import 'libs/constants.js';
@import 'libs/utils.js';

// Globals
var userFlowMetadataLayerNameKey = new RegExp( userFlowMetadataLayerName );
var doc;

// Sandboxing
function exportForUserFlows( context ) {
    doc = context.document;

    var homeFolder = "/Users/" + NSUserName();
    new AppSandbox().authorize( homeFolder, doExport );
}

// onRun handler
function doExport() {
    // Set global
    if ( doc.fileURL() == null ) {
        doc.showMessage( "Please save your document first." );
        return;
    }

    // Ask the user where they want to export to
    var openPanel = NSOpenPanel.openPanel()
    openPanel.setCanChooseDirectories(true)
    openPanel.setCanChooseFiles(false)
    openPanel.setCanCreateDirectories(true)
    openPanel.setTitle("Choose an folder to export to...")
    openPanel.setPrompt("Export")

    if (openPanel.runModal() == NSOKButton) {
        // Get the url of the folder the user selected
        var exportBaseUrl = openPanel.URL()

        // Create an object to store the JSON data in
        var jsonObject = {}
        var sectionsJson = {}

        // Loop through all the pages
        var pageLoop = doc.pages().objectEnumerator()
        while ( page = pageLoop.nextObject() ) {

            // Create an object to store the descriptions for each artboard in this page, using the page name as the key
            var section = parseName( page.name() );
            if ( !section ) {
                return;
            }

            section.screens = {};

            // Switch to this page to avoid errors when exporting
            doc.setCurrentPage( page )

            // Hide screen descriptions
            hideScreenDescriptions( doc.currentPage().layers().array() )

            // Setup the URL for the page
            var pageDirectoryUrl = [exportBaseUrl URLByAppendingPathComponent:page.name() isDirectory:true]

            // Create the directory for this page to export to
            [[NSFileManager defaultManager] createDirectoryAtURL:pageDirectoryUrl withIntermediateDirectories:false attributes:null error:null]

            // Export each of this pages artboards to the page directory
            var artboardLoop = page.artboards().objectEnumerator()
            while ( artboard = artboardLoop.nextObject() ) {
                // Check that it's an artboard and not a slice
                if ( artboard.class() == MSArtboardGroup.class() ) {
                    // Export the artboard to the correct file location
                    var artboardPath = pageDirectoryUrl.URLByAppendingPathComponent( artboard.name() + fileExtension ).path()

                    var sizes = artboard.exportOptions().sizes().array()
                    var slices = MSSliceMaker.slicesFromExportableLayer_sizes(artboard, sizes).objectEnumerator()
                    while( slice = slices.nextObject() ) {
                        doc.saveArtboardOrSlice_toFile(slice, artboardPath);
                    }

                    var screen = getArtboardData( artboard );
                    if ( !screen ) {
                        return;
                    }

                    // Put the artboard description in the descriptions object
                    section.screens[ artboard.name() ] = screen;
                }
            }

            // Add section to JSON
            sectionsJson[ page.name() ] = section;
        }

        // Add the sections
        jsonObject[ sectionsJSONKey ] = sectionsJson;

        // Ask the user for the name of the project
        var projectName = [doc askForUserInput:"What is this project called?" initialValue:guessProjectName()]
        jsonObject[projectNameJSONKey] = new String(projectName)

        // Ask the user for the verson of the document
        var documentVersion = [doc askForUserInput:"What version of the document is this?" initialValue:guessDocumentVersion()]
        jsonObject[documentVersionJSONKey] = new String(documentVersion)

        // Convert the descriptions object to JSON
        var metadataFilePath = exportBaseUrl.URLByAppendingPathComponent(metadataFilename).path()
        var jsonString = [NSString stringWithFormat:"%@", JSON.stringify(jsonObject)];
        print( jsonString );

        [jsonString writeToFile:metadataFilePath atomically:true encoding:NSUTF8StringEncoding error:nil];

        doc.showMessage( "All done!" );
    }
}

function guessProjectName() {
    return getFilenameWithoutExtension().componentsSeparatedByString("_").firstObject()
}

function guessDocumentVersion() {
    return "Version " + getFilenameWithoutExtension().componentsSeparatedByString("_").lastObject()
}

function getFilenameWithoutExtension() {
    var filename = doc.fileURL().lastPathComponent()
    return [filename stringByReplacingOccurrencesOfString:".sketch" withString:""]
}

function hideScreenDescriptions( layers ) {
    processAllLayers( layers, function( layer ) {
        if ( userFlowMetadataLayerNameKey.test( layer.name() ) ) {
            layer.setIsVisible( false )
        }
    } )
}

function getArtboardData( artboard ) {
    // Get the user flow description text layer, if there is one
    var artboardData = parseName( artboard.name() );
    if ( !artboardData ) {
        return;
    }

    // Get any metadata
    var possibleMetadataLayer = getChildLayerByName(artboard, userFlowMetadataLayerName)
    if ( possibleMetadataLayer ) {

        // Get description
        var possibleDescriptionLayer = getChildLayerByName(possibleMetadataLayer, userFlowDescriptionLayerName)
        if (possibleDescriptionLayer) {
            artboardData.description = new String(possibleDescriptionLayer.stringValue())
        }

    }

    var size = artboard.absoluteRect().rect().size;
    artboardData.size = {
        width: size.width * 1,
        height: size.height * 1
    };

    return artboardData;
}

function parseName( name ) {
    var original = new String( name );
    var nameParts = name.split( " " );
    if ( nameParts.length === 1 ) {
        doc.showMessage( '"' + name + '" is not formatted correctly. Please use a name such as "01 Home"' );
        return;
    }

    var tag = nameParts[ 0 ];
    var displayTag = tag.replace( /\_/g, '.' );
    var status = null;

    var title = name.substringFromIndex( tag.length + 1 );
    var displayTitle = title.replace( /\_/g, ' ' );

    var data = {
        tag: displayTag,
        title: displayTitle,
        original: original,
    };

    var statusMatch = /\[([\w\s]+)\]/.exec( title );
    if ( statusMatch ) {
        data.status = statusMatch[ 1 ].toUpperCase();
        data.title = displayTitle.split( '[' )[ 0 ];
    }

    var firstCharacter = tag.charAt( 0 );
    if ( firstCharacter == "_" || firstCharacter == "-" ) {
        data.exclude = true;
    }

    return data;
}
