// variable to enable start screen
var ENABLE_START_SCREEN = false; 
var ENABLE_LOADING_SCREEN = false;

// shadow map variables
var SHADOW_SIZE = 2048;

// variable to enable debug mode
var showCollisionDebug = false;

//object array
var currentScene = "home"; // "home" or "walk"

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

//path folder rigged dog
var pathFolderRiggedDog = "./Objects/dog_separated_model/";

// images paths
var path_img_teapot="./Textures/teapot_tex_1.png";
var path_img_table="./table_tex_512.jpg";
var path_img_cat="./Cat/cat_diffuse.jpg";
var path_img_wall="./Textures/wall_tex.jpg";
var path_img_floor="./Textures/parquet_tex.jpg";
var path_img_dog = "./dog/dog_diff.jpg";
var path_img_heart = "./Textures/red.jpg";
var path_folder_skyboxes = "./Skyboxes/";
var path_img_skybox = "./Skyboxes/Skybox/skybox.jpg";
var path_img_skybox_day=  "./Skyboxes/Cubemap/cubemap_sky_day.png";
var path_img_skybox_night = "./Skyboxes/Cubemap/cubemap_sky_night_2.png";
var path_folder_skybox_park="./Skyboxes/Park2/";
var path_img_moon = "./Textures/moon_2.png";
var path_img_sun= "./Textures/sun.png";
var path_img_painting = "./Textures/london.jpg";
var path_img_cornice = "./Textures/blue_navy.jpg";
var path_img_ball= "./ball_color/ball_diff.jpg";
var path_img_curtain = "./Textures/curtain_tex.png";
var path_img_musicNote = "./Textures/hot_pink.jpg";
var path_img_halo = "./Textures/halo.png";
var path_img_grass="./Textures/grass_3.jpg";
var path_img_steel="./Textures/steel.png";
var path_img_blue="./Textures/blue_navy.jpg";
//icons path
var path_icon_music_off="./Icons/music_off.png"
var path_icon_music_on="./Icons/music_on.png"
var path_icon_sun= "./Icons/sun.png"
var path_icon_moon ="./Icons/fullmoon.png"
var path_icon_sun_auto= "./Icons/auto_moving_sun.png"


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

//table specific  variables
var tableMtlTexture = null;
var tableMaterialProgram = null;
var tableMaterialAttribs = {};
var tableMaterialUniforms = {};

var tableColorTexture = null;
var tableSpecularTexture = null;
var tableAOTexture = null;

//ball specific variables
var ballMtlTexture = null;

//heart specific variables
var heartMtlTexture = null;


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

//light night/day
var  lightIntensity_night = 0.45;
var  ambientStrength_night = 0.18;
var  lightTint_night = vec3(0.55, 0.65, 1.0);
var lightIntensity_sun = 1.0;
var  ambientStrength_sun = 0.28;
var lightTint_sun = vec3(1.0, 0.92, 0.75);

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
//var kibbleSound= new Audio("./Audio/pouring_food.mp3");
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

//****************************************************** */
//             Colliders                                  */
//****************************************************** */
var bowlColliderRadius = 0.5;
var bowlColliderHeight = 0.35;
var bowlColliderY = bowlY + 0.05;