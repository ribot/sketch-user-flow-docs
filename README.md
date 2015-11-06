# Sketch User Flows
This plugin exports every artboard in your design document and allows you to create a user flows document for clients by populating a template.

- Export for User Flows (⌃⇧E)
- Populate User Flows (⌃⇧P)

# Installation
1. Download the repository using this [link](https://github.com/ribot/sketch-user-flow-docs/archive/master.zip)
2. Unzip the files from the ZIP
3. In Sketch 3, select `Plugins > Reveal Plugins Folder...` from the menu bar
4. Put the (downloaded, unzipped) folder in here

# Setup
In your visual design document...
* **Pages** should be given a number and title separated by a space e.g.:
    * 01 Welcome
    * 02 Signin
* **Artboards** should have a number and title separated by a space e.g.:
    * 02.1 Sign in
    * 02.2 Sign in success
    * 02.3 Sign in failure
* To hide a page or artboard, start the name with an underscore (e.g.):
   *  _01 Welcome
   *  _02.1 Sign in
* Add a text layer named `User Flow Description` to each artboard (screen) where you want a description in the user flow doc (you can hide this text layer if you like)

# Usage
2. Run the **Export for User Flows** plugin `(⌃⇧E)`
2. Fill in the project name and version number
3. Create a new User Flow doc by going `File > New From Template > Ribot Visual Doc iPhone 6`
4. Run the **Populate User Flows** plugin `(⌃⇧P)`
5. Save your User Flow doc

# Compatibility
Tested on Sketch 3.3 and 3.4

# Licence
```
Copyright 2014 ribot

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
