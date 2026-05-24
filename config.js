// variable to enable start screen
var ENABLE_START_SCREEN = false; 

// variable to enable debug mode
var showCollisionDebug = false;

//object array
var currentScene = "home"; // "home" or "walk"

// Object paths
var modelPath_teapot = "./Objects/teapot.obj";
var modelPath_table = "./Objects/table.obj";
var modelPath_cat= "./Cat/cat.obj";
var modelPath_dog = "./dog/dog.obj";
var modelPath_ball = "./ball_color/ball.obj";
var modelPath_shiba_glb = "./Objects/shiba_dog.glb";

//path folder rigged dog
var pathFolderRiggedDog = "./Objects/dog_separated_model/";

// images paths
var path_img_teapot="./Textures/teapot_tex_1.png";
var path_img_table="./table_tex_512.jpg";
var path_img_cat="./Cat/cat_diffuse.jpg";
var path_img_wall="./Textures/wall_tex.jpg";
var path_img_floor="./Textures/parquet_tex.jpg";
var path_img_dog = "./dog/dog_diff.jpg";
var path_img_skybox = "./skybox/skybox.jpg";
var path_img_skybox_night = "./Textures/Cubemap/cubemap_sky_night.png";
var path_img_painting = "./Textures/london.jpg";
var path_img_cornice = "./Textures/blue_navy.jpg";
var path_img_ball= "./ball_color/ball_diff.jpg";
var path_img_curtain = "./Textures/curtain_tex.png";


//texture variables
var useTexture_teapot = true;
var useTexture_table = true;

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

//curtain variables
var CURTAIN_ROWS = 28;
var CURTAIN_COLS = 24;

var CURTAIN_WIDTH = 2.7;
var CURTAIN_HEIGHT = 2.2;

var CURTAIN_ORIGIN_X = 6.92;
var CURTAIN_ORIGIN_Y = 1.25;
var CURTAIN_ORIGIN_Z = -1.28;


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