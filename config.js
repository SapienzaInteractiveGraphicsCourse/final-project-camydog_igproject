// variable to enable start screen
var ENABLE_START_SCREEN = true; 
var ENABLE_LOADING_SCREEN = true;


//loading bar variables 
var loadingProgressValue = 0;
var loadingProgressTarget = 0;
var loadingProgressAnimationId = null;

//current Scene either "home" or "park"
var currentScene = "home"; 
var sceneTransitionActive = false;
var ENABLE_SCREEN_TRANSITION = true; // metti true quando vuoi vederla
var startSceneChoice = "home";
var showCameraHelpAtStart = true;
var startGlobalAudioEnabled = true;


// some camera settings
var cameraLegendTimeout = null;
var cameraControlsLegendClosedByUser = false;

var cameraKeyboardKeys = {};
var cameraFocusMode = "free";
var cameraPanOffset = vec3(0.0, 0.0, 0.0);
var cameraDogAutoAngle = false;

var CAMERA_MIN_DISTANCE = 2.2;
var CAMERA_MAX_DISTANCE = 25.0;

var cameraDogMode = "static"; // valori possibili: "static", "follow", "autoAngle"

var cameraDogStaticTarget = vec3(0.0, -0.6, 0.0);

var isPanningCamera = false;
var mouseSensitivityPan = 0.0012;

//current time of day either "day" or "night"
var isNight = false;

var gameMessageTimeout = null;

// shadow map variables
var POINT_SHADOW_SIZE = 4096;

// variable to enable debug mode
var showCollisionDebug = false;


// options for showing objects
var okTeapot=false;
var okCat=false;

// Object paths
var modelPath_teapot = "./Objects/teapot.obj";
var modelPath_table = "./Objects/table.obj";
var modelPath_cat= "./Cat/cat.obj";
var modelPath_dog = "./dog/dog.obj";
var modelPath_ball = "./ball_color/ball.obj";
var modelPath_shiba_glb = "./Objects/shiba_dog.glb";
var modelPath_heart= "./Objects/heart/heart.obj";
var modelPath_musicNote= "./Objects/music_note_1.obj";
var modelPath_sun = "./Objects/sun/sun.obj";
var modelPath_moon= "./Objects/moon.obj";
var modelPath_bowl="./Objects/dog_bowl.obj";
var modelPath_bench="./Objects/bench.obj";
var modelPath_frisbee="./Objects/frisbee.obj";
var modelPath_grassBlock="./grass_field/Grass/Grass/Grass_Green/Grass_Patch_Green_Tall.obj";
var modelPath_leaf="./Objects/leaf_1_modified.obj";


//path folder rigged dog
var pathFolderRiggedDog = "./Objects/dog_separated_model/";

// images & textures paths
var path_img_teapot="./Textures/teapot_tex_1.png";
var path_img_table="./Textures/table_tex_512.jpg";
var path_img_cat="./Cat/Cat_diffuse.jpg";
var path_img_wall="./Textures/wall_tex.jpg";
var path_img_floor="./Textures/parquet_tex.jpg";
var path_img_dog =null;
var path_img_heart = "./Textures/red.jpg";
var path_folder_skyboxes = "./Skyboxes/";
var path_img_skybox = "./Skyboxes/Skybox/skybox.jpg";
var path_img_skybox_day=  "./Skyboxes/Cubemap/cubemap_sky_day.png";
var path_img_skybox_night = "./Skyboxes/Cubemap/cubemap_sky_night_2.png";
var path_folder_skybox_park="./Skyboxes/Park2/";
var path_img_moon = "./Textures/moon_2.png";
var path_img_sun= "./Textures/sun_1.png";
var path_img_painting = "./Textures/london.jpg";
var path_img_cornice = "./Textures/blue_navy.jpg";
var path_img_ball= "./ball_color/ball_diff.jpg";
var path_img_curtain = "./Textures/curtain_tex.png";
var path_img_musicNote = "./Textures/hot_pink.jpg";
var path_img_halo = "./Textures/halo.png";
var path_img_grass="./Textures/grass_3.jpg";
var path_img_steel="./Textures/steel.png";
var path_img_blue="./Textures/blue_navy.jpg";
var path_img_frisbee= "./Textures/frisbee_2.png";
var path_img_bench= "./Textures/textures_bench/bench_BaseColor.png";
var path_img_grass_block="./grass_field/Grass/Grass/Grass_Green/GrassGreen_Strands_color.jpg";
var path_img_leaf="./leaf_1/leaf_1_tex.jpg";

//icons path
var path_icon_music_off="./Icons/music_off.png"
var path_icon_music_on="./Icons/music_on.png"
var path_icon_sun= "./Icons/sun.png"
var path_icon_moon ="./Icons/fullmoon.png"
var path_icon_sun_auto= "./Icons/auto_moving_sun.png"
var path_icon_ball="./Icons/ball.png"
var path_icon_audio_on = "./Icons/yes_audio.png";
var path_icon_audio_off = "./Icons/no_audio.png";
var globalAudioMuted = false;


//texture variables
var useTexture_teapot = true;
var useTexture_table = true;
var useTexture_heart = true;
var teapotTexture;
var teapotBuffers;  
var tableTexture;
var tableBuffers;
var catBuffers; 
var catTexture;
var wallTexture;
var floorTexture;
var dogBuffers;
var benchBuffers;
var frisbeeBuffers;
var grassBlockBuffers;
var leafBuffers;


var daySkyboxTexture;
var nightSkyboxTexture;
var parkSkyboxTexture;
var dogTexture;
var skyboxTexture;
var paintingTexture;
var corniceTexture;
var ballTexture;
var riggedDogTexture;
var heartTexture = null;
var musicNoteTexture;
var moonTexture;
var sunTexture;
var haloTexture;
var grassTexture;
var bowlTexture;
var waterDiskTexture;
var waterHighlightTexture;
var curtainTexture = null;
var kibbleTexture ;
var benchTexture;
var frisbeeTexture;
var grassBlockTexture;
var leafTexture;
var fireflyTexture;

//table specific  variables
var tableMtlTexture = null;
var tableMaterialProgram = null;
var tableMaterialAttribs = {};
var tableMaterialUniforms = {};

var tableColorTexture = null;
var tableSpecularTexture = null;
var tableAOTexture = null;

//heart specific variables
var heartMtlTexture = null;

//ball specific variables
var ballMtlTexture = null;

var ballOutsideHomeWarningShown = false;
var ballOutsideHomeActive = false;
var ballBlockedOutsideHome = false;

var ballOnTableWarningShown = false;
var ballBlockedOnTable = false;

var ballSettingsPanelHasBeenOpened = false;
var ballSettingsPanelClosedByUser = false;

var ballRenderInitialized = false;
var ballRenderX = 0.0;
var ballRenderY = 0.0;
var ballRenderZ = 0.0;

var ballUnderTableWarningShown = false;
var ballBlockedUnderTable = false;

//****************************************************** */
/*              BUFFERS                                  */
//****************************************************** */

//Cloth buffers
var curtain = null;

var waterDiskBuffers;



// room buffers
var roomPlaneBuffers;
var roomBoxBuffers;

//right wall buffers
var rightWallWindowBuffers;

//ball buffers
var ballBuffers = null;
var ballTexture = null;

//heart buffers
var heartBuffers = null;

//musicNote buffers
var musicNoteBuffers = null;

// halo buffer
var haloBuffers = null;

//sun buffers
var sunBuffers = null;
//moon buffers
var moonBuffers;

//curtain rod buffers
var curtainRodBuffers;
//bowl buffers
var bowlBuffers;

// kibble buffers
var kibbleBuffers;


//skybox
var skyboxProgram;
var skyboxBuffer;

var skyboxPosLoc;
var skyboxMvpLoc;
var skyboxSamplerLoc;


// Camera variables
var camAngle = 0.0;
var camPitch = 0.0;
var camRadius = 8.0;

var cameraTarget =  vec3(0.0, 0.5, 0.0);
//var cameraFov = 80.0;
var cameraFov = 58.0;
var cameraAngle = 35.0;
var cameraHeight = 4.0;
var cameraDistance = 10.0;   // questo è lo zoom


var cameraAngleSlider ;
var cameraHeightSlider;
var cameraDistanceSlider ;

var cameraAngleValue ;
var cameraHeightValue ;
var cameraDistanceValue ;


var at = vec3(0.0, 0.5, 0.0);
var up = vec3(0.0, 1.0, 0.0);
var eye = vec3(0.0, 4.0, 10.0);

var viewMatrix = lookAt(eye, at, up);
var projectionMatrix = perspective(cameraFov, aspect, 0.1, 120.0)
var aspect;

//light night/day and park in particular
var  lightIntensity_night = 0.40;
var  ambientStrength_night = 0.18; //0.18;
var  lightTint_night = vec3(0.55, 0.65, 1.0);

var lightIntensity_sun = 1.0;
var  ambientStrength_sun = 0.28;
var lightTint_sun = vec3(1.0, 0.92, 0.75);

// brighter night only for the park
var lightIntensity_parkNight = 0.48;
var ambientStrength_parkNight = 0.26;
var lightTint_parkNight = vec3(0.55, 0.65, 1.0);



// auto moving sun variables 
var autoSunEnabled = false;
var autoSunAngle = 0.0;
var lastRenderTime = performance.now();
var autoSunButton;

//curtain variables
var CURTAIN_ROWS = 28;
var CURTAIN_COLS = 24;

var CURTAIN_WIDTH = 2.7;
var CURTAIN_HEIGHT = 2.2;

var CURTAIN_ORIGIN_X = 6.92;
var CURTAIN_ORIGIN_Y = 1.25;
var CURTAIN_ORIGIN_Z = -1.28;

//water specular variables
var waterX = 0.0;
var waterY = -2.15;  // usa il valore che ti funziona ora
var waterZ = 5.0;

var waterScale=0.3;
var waterButton;

//bowl variables
var bowlX=5.0;
var bowlY=-2.25;
var bowlZ=5.0;
var bowlBody = null;


//skinned dog variables
var skinnedDog = null;
var skinnedDogProgram = null;
var skinnedDogAttribs = {};
var skinnedDogUniforms = {};

var skinnedDogLoadState = "pending";
// pending | loading | ready | failed

var DOG_WALL_PICKUP_MARGIN = 1.70;



var skinnedDogLoadErrorMessage = "";
var dogLoadErrorShown = false;
var dogMissingCheckTimer = 0.0;

// Front legs
var FRONT_LEFT_HIP   = 4;
var FRONT_LEFT_KNEE  = 3;
var FRONT_LEFT_ANKLE = 2;
var FRONT_LEFT_BALL  = 1;

var FRONT_RIGHT_HIP   = 11;
var FRONT_RIGHT_KNEE  = 10;
var FRONT_RIGHT_ANKLE = 9;
var FRONT_RIGHT_BALL  = 8;

// Hind legs
var HIND_LEFT_HIP    = 41;
var HIND_LEFT_KNEE1  = 40;
var HIND_LEFT_KNEE2  = 39;

var HIND_RIGHT_HIP   = 47;
var HIND_RIGHT_KNEE1 = 46;
var HIND_RIGHT_KNEE2 = 45;

// Tongue bones - nodeIndex
var TONGUE_02 = 17; // Wolf_Tongue_01_02SHJnt
var TONGUE_03 = 16; // Wolf_Tongue_01_03SHJnt
var TONGUE_04 = 15; // Wolf_Tongue_01_04SHJnt


var skinnedDogShadowProgram = null;
var skinnedDogShadowAttribs = {};
var skinnedDogDepthProgram = null;
var skinnedDogDepthAttribs = {};
var skinnedDogDepthUniforms = {};
var skinnedDogShadowUniforms = {};
var ENABLE_SKINNED_DOG_SHADOW = true;


var dogFetchBallMode = false;

var dogFetchX = -3.2;
var dogFetchZ = 4.0;

var dogPath = [];
var dogPathIndex = 0;

var dogFetchTarget = null;
var dogFetchLowerAmount= 0.0;

var skinnedDogAlreadyTargeted = false;

var dogIsWalking = dogFetchBallMode;
var dogLookAtBallX = 0.0;
var dogLookAtBallZ = 0.0;
var dogFetchLoweringActive = false;

//dog taking ball 
var dogHasBall = false;
var dogMouthPickTimer = 0.0;
var dogCurrentAngle = 90.0;


//dog crouching variables

var dogCrouchAmount = 0.0;
var dogCrouchActive = false;

var dogLieDownAmount = 0.0;
var dogLieDownActive = false;
var callDogClickMode = false;

var dogCallMode = false;
var dogCallPath = [];
var dogCallPathIndex = 0;


var dogIsWalking =
    (dogFetchBallMode || dogCallMode) &&
    !dogCrouchActive;
    

//heart variables
var showDogHeart = false;
var dogHeartTimer = 0.0;
var dogHeartDuration = 2.0;
var hideDogHeartPending = false;
var hideDogHeartTimer = 0.0;
var hideDogHeartDelay = 1.5; 

//background music variables
var backgroundMusic; 
var musicVolumeSlider; 
var musicVolumeValue;
var musicButton;
var musicIcon; 

// caress to dog variables
var petDogMode = false;

var dogPetHeadYaw = 0.0;
var dogPetHeadPitch = 0.0;

var dogPetTargetYaw = 0.0;
var dogPetTargetPitch = 0.0;

var lastPetMouseX = 0.0;
var lastPetMouseY = 0.0;
var dogBreathSound ;

var dogPetAudioPlayed = false;
var dogIsBeingPetted = false;

// musicNote object variables
var showDogMusicNote = false;
var dogHappySound= new Audio("./Audio/notification.mp3");
dogHappySound.volume = 0.6;
var dogHappySoundPlayed = false;


//halo vairables
var haloProgram;
var isSunHalo=false;

//bowl with water variables
var waterVisible = false;
var waterFillAmount = 0.0;
var waterFillSpeed = 1.8;
var waterSound = new Audio("./Audio/water.mp3");
 waterSound.volume = 0.6;

//bowl with food variables


var radius = Math.random() * 0.18;
var GROUP_WORLD  = 1;
var GROUP_KIBBLE = 2;
var GROUP_BOWL   = 4;
var GROUP_CATCH  = 8;

var kibbleWallBodies = [];
var kibbleParticles = [];
var kibbleVisible = false;

var kibbleCatchRadius = 0.04;
var kibbleCatchHeight = 0.08;

var numKibbles = 30;
var kibbleRadius = 0.035;

// piano invisibile dove atterrano i croccantini
var pouringFoodSound;
var kibbleCatchBody = null;

var kibbleWallRadius = 0.26;
var kibbleWallHeight = 0.35;
var kibbleWallThickness = 0.08;
var kibbleWallSegments = 24;

var kibbleSpawnRemaining = 0;
var kibbleSpawnTimer = 0.0;
var kibbleSpawnInterval = 0.14; // cadono uno alla volta, più realistico
var kibbleSpawnIndex = 0;


var kibbleObjects = [];
var kibbleMaxFallSpeed = 3.0; // più basso = cadono più lentamente

var kibbleVisualScale = 2.0;     // grandezza visiva
var kibbleVisualYOffset = 0.005;

var foodButton;

var currentWind;

var toggleSidePanelButton;

//****************************************************** */
//             Colliders        Table                          */
//****************************************************** */
var bowlColliderRadius = 0.5;
var bowlColliderHeight = 0.35;
var bowlColliderY = bowlY + 0.05;


//****************************************************** */
//             Colliders        Bench                    */
//****************************************************** */
var BENCH_COLLIDER_X = -5.0;
var BENCH_COLLIDER_Y = -1.85;
var BENCH_COLLIDER_Z = -2.8;

// dimensioni VISIVE del box
var BENCH_COLLIDER_WIDTH  = 4.0;  // lunghezza panchina
var BENCH_COLLIDER_HEIGHT = 3.0;  // altezza box
var BENCH_COLLIDER_DEPTH  = 2.0;  // profondità panchina

var BENCH_COLLIDER_ROT_Y = 90.0;

// margine per il cane
var BENCH_DOG_MARGIN = 1.2;


/**********FRISBEE */
var frisbeeFlying = false;
var frisbeeLanded = false;
var frisbeePreparingThrow = false;
var frisbeeAttachedToHand = false;

var frisbeeStartTime = 0;
var frisbeeDuration = 1400;

var frisbeeStartPos = vec3(-1.2, -1.1, 4.0);
var frisbeeEndPos   = vec3(3.2, -2.25, -3.2);

var frisbeeSpin = 0.0;

var frisbeeThrowMode= false;


var frisbeeHandPos = vec3(-1.2, -1.1, 4.8);
var frisbeeHandTargetPos = vec3(-1.2, -1.1, 4.8);

var frisbeeHandFixedZ = 4.8;

// posizione verticale "naturale" della mano
var frisbeeHandBaseY = -1.1;

// limiti verticali: così non va troppo in alto o troppo in basso
var frisbeeHandMinY = -1.7;
var frisbeeHandMaxY = -0.2;

// più è basso, meno segue verticalmente il mouse
var frisbeeHandVerticalSensitivity = 1.0;

// smoothing: più basso = più morbido/lento
var frisbeeHandSmoothing = 0.7;


var frisbeeLastMouseX = null;
var frisbeeLastMouseY = null;

var frisbeeHandXSpeed = 0.012;
var frisbeeHandYSpeed = 0.008;

var frisbeeHandMinX = -8.0;
var frisbeeHandMaxX = 8.0;

var frisbeeHandMinY = -2.0;
var frisbeeHandMaxY = 1.0;

var frisbeeHasMousePosition = false;

// try 3.4-3.8
var frisbeeHandDistanceFromCamera = 3.6;

/*
    Offset nel palmo.
    X positivo = più a destra.
    Y positivo = più in alto.
*/
var frisbeeHandPalmOffsetX = 0.25;
var frisbeeHandPalmOffsetY = -0.15;

/*
    Più alto = segue di più la mano.
    Se lo vedi in ritardo, aumenta.
*/
var frisbeeHandSmoothing = 0.35;

var frisbeeReleaseCursorActive = false;
var frisbeeReleaseCursorTimer = null;


// dog + frisbee fetch
var dogHasFrisbee = false;
var frisbeeAlreadyTargeted = false;

var wooshFrisbeeSound;

// either "ball" or "frisbee" based on what the dog is fetching
var dogFetchObjectType = null;

var dogReturningWithFrisbee = false;

var frisbeeReturnTarget = null;

var frisbeeReturnedAndWaiting = false;

//****************************************************** */
//             Global variables for grass                */
//****************************************************** */
var grassPatchInstances = [];


//**********LEAVES */
var fallingLeaves = [];
var leafSpawnTimer = 0.0;
var nextLeafSpawnTime = 0.5;

var maxFallingLeaves = 18;
// Questa la colleghiamo allo slider del vento
var parkWindStrength = 0.07


/*****fireflies */
var fireflyWaitMessageTimeout = null;

var fireflies = [];
var firefliesInitialized = false;
var maxFireflies = 25;
var fireflySphereBuffers;


var dogFireflyCatchActive = false;
var dogFireflyCatchPhase = "idle"; // "idle", "chase", "jump"

var dogFireflyCatchTimer = 0.0;

var dogFireflyChaseDuration = 6.0;
var dogFireflyJumpDuration = 0.9;

var dogFireflyCatchCooldown = 2.0;

var dogFireflyTarget = null;
var dogFireflyPreviousTarget = null;

var dogFireflyChaseRadius = 2.5;

var dogFireflyCircleCenterX = 0.0;
var dogFireflyCircleCenterZ = 0.0;
var dogFireflyOrbitAngle = 0.0;

var dogFireflyRearDuration = 3.0;

/************************** */
//      TEAPOT PLAY DOG     //
/************************** */
var teapotKeyboardKeys = {};

var TEAPOT_REST_X = 0.85;
var TEAPOT_REST_Y = -1.05;
var TEAPOT_REST_Z = 0.15;

var TEAPOT_ROTATION_DEMO_Y = TEAPOT_REST_Y + 0.65;

var TEAPOT_CHASE_Y = 0.45;

var dogFollowTeapotMode = false;

var dogFollowTeapotLastX = 9999.0;
var dogFollowTeapotLastZ = 9999.0;

var dogFollowTeapotRepathTimer = 0.0;

var DOG_TEAPOT_REPATH_INTERVAL = 0.35;
var DOG_TEAPOT_MIN_MOVE_TO_REPATH = 0.30;
var TEAPOT_CHASE_MIN_Y = -0.7;
var TEAPOT_CHASE_MAX_Y = 1.8;

var TEAPOT_CHASE_STOP_OFFSET = 1.35;


var TEAPOT_TABLE_MIN_X = -2.4;
var TEAPOT_TABLE_MAX_X =  2.4;
var TEAPOT_TABLE_MIN_Z = -1.8;
var TEAPOT_TABLE_MAX_Z =  1.8;

var TEAPOT_TABLE_AVOID_MARGIN = 0.9;

var DOG_TEAPOT_WAIT_AFTER_MOVE = 0.60;
var DOG_TEAPOT_STILL_EPSILON = 0.035;

var dogTeapotStillTimer = 0.0;
var dogTeapotLastObservedX = 9999.0;
var dogTeapotLastObservedZ = 9999.0;
var DOG_TEAPOT_TABLE_TARGET_EXTRA = 1.10;

var DOG_TEAPOT_PATH_EXTRA = 1.65;
var DOG_TEAPOT_WAYPOINT_RADIUS = 0.55;
