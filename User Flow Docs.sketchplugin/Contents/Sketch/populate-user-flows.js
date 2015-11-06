// @import 'libs/sandbox.js';
@import 'libs/constants.js';
@import 'libs/utils.js';

// Globals
var doc;

// onRun handler
function populateUserFlows( context ) {
  doc = context.document;

  var path = getExportsFolder();

  // Get metadata into a JSON object
  var metadata = getMetadata(path);

  // Get the project name from the metadata
  // Get the document version from the metadata
  // Get the descriptions from the metadata
  var projectName = metadata[PROJECT_NAME_JSON_KEY];
  var documentVersion = metadata[DOCUMENT_VERSION_JSON_KEY];
  var screenData = metadata[SECTIONS_JSON_KEY];

  // Select first template page
  var templatePage = getPageByName(TEMPLATE_PAGE_NAME);

  // Get number of screens per page
  var numberOfScreensPerPage = getScreensPerPageFromTemplate(templatePage);

  // Populate cover
  populateCover(projectName, documentVersion);

  // Populate screens
  populateScreens(path, templatePage, numberOfScreensPerPage, projectName, screenData);

  // Remove template
  removeTemplatePages();

  // Let it snow...
  finish();
}

function getMetadata( path ) {
  var metadataFilePath = path.URLByAppendingPathComponent(METADATA_FILE_NAME);
  var metadataString = [NSString stringWithContentsOfURL:metadataFilePath encoding:NSUTF8StringEncoding error:null];
  return JSON.parse(metadataString);
}

// Ask user to select exports folder
function getExportsFolder() {
  // Set up 'File open' modal
  var openPanel = NSOpenPanel.openPanel();
  openPanel.setCanChooseDirectories(true);
  openPanel.setCanChooseFiles(false);
  openPanel.setCanCreateDirectories(false);

  openPanel.setTitle("Choose your exports folder");
  openPanel.setPrompt("Choose");

  // Handle folder chosen
  if (openPanel.runModal() == NSOKButton) {
    return openPanel.URL();
  }
}

// Get screens per page from Template > Artboard > Screens group
function getScreensPerPageFromTemplate(templatePage) {
  var artboard = templatePage.artboards().firstObject();

  // Get Screens group
  var screens = getChildLayerByName(artboard, SCREENS_LAYER_GROUP_NAME);

  // Get number of children in Screens group
  return screens.layers().count();
}


// Get the 'Screens' group
function getTemplateScreens() {
  return getChildLayerByName(getFirstArtboard(), SCREENS_LAYER_GROUP_NAME);
}

// Populate screens
function populateScreens(path, templatePage, numberOfScreensPerPage, projectName, screenData) {
  var fileManager = NSFileManager.defaultManager();
  var folders = fileManager.shallowSubpathsOfDirectoryAtURL( path );

  // Loop through folders
  var folderLoop = folders.objectEnumerator();
  while (folder = folderLoop.nextObject()) {
    var key = folder.lastPathComponent();
    var folderData = screenData[ key ];

    // Check if it's a folder and if shouldIgnoreItem should be ignored
    if( isFolder( folder ) || shouldIgnoreItem( folderData ) ) {
      return;
    }

    // Duplicate Templates page to start
    var pageCount = 0;
    var page = duplicateTemplatePage(templatePage);

    // Get folder name (for page title)
    var sectionDisplayName = folderData.original;

    // Get files for current folder
    var files = fileManager.shallowSubpathsOfDirectoryAtURL(folder);
    var numberOfFilesInFolder = files.count();
    var screensInSectionCount = 0;
    var screenCount = 0;

    // Sort files like finder
    var sortedFiles = []
    for ( var i=0; i<numberOfFilesInFolder; i++ ) {
      sortedFiles.push( [NSDictionary dictionaryWithObjectsAndKeys: files[i], @"name" ] );
    }
    sortedFiles.sort( sortLikeFinder );

    // Loop through files
    for ( var i=0; i<numberOfFilesInFolder; i++ ) {
      var file = sortedFiles[i].name;
      var key = file.lastPathComponent().stringByDeletingPathExtension();
      var fileData = folderData.screens[ key ];

      // Abort if we should ignore this image
      if( shouldIgnoreItem( fileData ) ) {
        continue;
      }

      // Get correct screen group
      var templateScreens = getTemplateScreens();
      var screenGroup = templateScreens.layers().array()[screenCount];

      // Get image layer
      var placeholderLayer = getChildLayerByName(screenGroup, SCREEN_PLACEHOLDER_LAYER_NAME);
      var maskLayer = getChildLayerByName(screenGroup, SCREEN_MASK_LAYER_NAME);

      // Get image data
      var data = fileManager.contentsAtPath(file);
      var image = NSImage.alloc().initWithData(data);

      // Use 'replace image' action
      var replaceAction = doc.actionsController().actionWithName( "MSReplaceImageAction" );
      replaceAction.applyImage_tolayer( image, placeholderLayer );

      // Reposition and resize new image
      // This is mostly used for cropping screens that are too big (e.g. websites)
      if ( maskLayer && fileData.size.width ) {
        placeholderLayer.setConstrainProportions( false );

        var rect = CGRectZero;
        rect.size.width = placeholderLayer.rect().size.width;
        rect.size.height = rect.size.width * fileData.size.height / fileData.size.width;
        rect.origin.x = maskLayer.rect().origin.x;
        rect.origin.y = maskLayer.rect().origin.y;

        placeholderLayer.setRect( rect );
        placeholderLayer.setConstrainProportions( true );
      }

      // Update screen number
      setTextOnChildLayerByName( screenGroup, SCREEN_NUMBER_LAYER_NAME, fileData.tag );

      // Update heading text
      setTextOnChildLayerByName( screenGroup, SCREEN_HEADING_LAYER_NAME, fileData.title );

      // Update description
      setTextOnChildLayerByName( screenGroup, SCREEN_DESCRIPTION_LAYER_NAME, fileData.description || '' );

      // Update status
      if ( fileData.status ) {
        setTextOnChildLayerByName( screenGroup, SCREEN_STATUS_LAYER_NAME, fileData.status );
        var screenStatusLayer = getChildLayerByName( screenGroup, SCREEN_STATUS_LAYER_NAME );
        screenStatusLayer.setIsVisible(true);
      }

      // If it's the first screen on a page, update page title
      if (screenCount === 0) {
        var header = getChildLayerByName(getFirstArtboard(), HEADER_LAYER_NAME);
        setTextOnChildLayerByName(header, PROJECT_NAME_LAYER_NAME, projectName);
        setTextOnChildLayerByName(header, SECTION_NAME_LAYER_NAME, sectionDisplayName);

        page.setName(sectionDisplayName);
      }

      // Update the screenCount
      screenCount++;
      screensInSectionCount++;

      // If we've run out of screens in this section, remove any unnecessary ones
      var haveRunOutOfScreensForSection = (screensInSectionCount == numberOfFilesInFolder);
      if (haveRunOutOfScreensForSection) {
        // Work out how many slots left
        var slotsLeft = ( numberOfScreensPerPage - screenCount ) % numberOfScreensPerPage;

        // Remove empty slots
        var screens = getChildLayerByName( getFirstArtboard(), SCREENS_LAYER_GROUP_NAME );
        for (var j=0; j<slotsLeft; j++) {
          screens.removeLayer(screens.lastLayer());
        }
      }

      // If we've run out of screens in this section OR we're on the third screen, duplicate the page and go through loop again
      var haveRunOutOfSlotsForPage = !(screenCount % numberOfScreensPerPage);
      if (haveRunOutOfSlotsForPage) {
        // Update counts
        screenCount = 0;
        pageCount++;

        // Duplicate page
        page = duplicateTemplatePage(templatePage);
      }

      doc.refreshSidebarWithMask( 1 );
    }
  }
}

function shouldIgnoreItem( item ) {
  if ( typeof item  == 'undefined' ) {
    return false;
  }
  return ( item.exclude ) ? true : false;
}

function duplicateTemplatePage(templatePage) {
  var newPage = templatePage.copy();

  var pages = doc.documentData().pages();
  [pages insertObject:newPage afterObject:doc.currentPage()];
  doc.setCurrentPage(newPage);

  return newPage;
}

function populateCover(projectName, documentVersion) {
  // Get the cover page and it's artboard
  var coverPage = getPageByName(COVER_PAGE_NAME);
  var coverArtboard = coverPage.artboards().firstObject();

  // Get the cover header
  // TODO: Remove the need to get the header by doing a deep search for layers in the page
  var coverHeader = getChildLayerByName(coverArtboard, COVER_HEADER_LAYER_GROUP_NAME);

  // Set the project name
  setTextOnChildLayerByName(coverArtboard, COVER_PROJECT_NAME_LAYER_NAME, projectName);
  // Set the version number
  setTextOnChildLayerByName(coverHeader, COVER_DOCUMENT_VERSION_LAYER_NAME, documentVersion);
}

function removeTemplatePages() {
  var templatePages = getPagesByName(TEMPLATE_PAGE_NAME);
  doc.pages().removeObjectsInArray( templatePages );
}

// TODO: Show save dialog
function finish() {
  doc.showMessage( "All done!" );
}