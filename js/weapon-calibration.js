/* View-camera transforms for the converted GoldSrc rigs.
 * Position is in view-scene units. The native rig scale and axes remain intact.
 * 16.4.1: keep forearm openings below the bottom frame at rest.
 * Original depth, rig scale and FOV are retained to avoid near-plane clipping.
 */
const ViewmodelCalibration=Object.freeze({
 // First-person vertical FOV, X, Y, Z.
 usp:[55,.012,-.018,-.232],
 glock18:[66,.006,-.014,-.112],
 p228:[59,.008,-.014,-.19],
 deagle:[64,.008,-.021,-.132],
 elite:[61,0,-.021,-.234],
 fiveseven:[62,.01,-.012,-.205],
 mac10:[66,.006,-0.043,-.114],
 tmp:[65,.012,-.025,-.108],
 mp5:[65,.011,-.018,-.132],
 ump45:[64,.01,-.015,-.148],
 p90:[64,.006,-.024,-.14],
 galil:[67,.009,-.016,-.12],
 ak47:[66,.012,-0.087,-.163],
 famas:[65,.008,-.024,-.141],
 m4a1:[56,.016,-.095,-.319],
 aug:[67,.008,-0.087,-.203],
 sg552:[64,.008,-0.052,-.18],
 scout:[61,.008,-0.08,-.203],
 awp:[60,.011,-0.074,-.235],
 g3sg1:[63,.012,-0.084,-.18],
 sg550:[61,.01,-.016,-.214],
 m3:[53,.016,-0.126,-.388],
 xm1014:[61,.01,-0.08,-.195],
 m249:[60,.01,-0.052,-.201],
 knife:[65,0,-0.025,-.08],
 // Shield rigs are mirrored as a whole by Phase13.applyHand.
 // Close foreground framing: narrow only the view camera FOV, keeping
 // native scale, depth and animation intact. Forearms exit the frame.
 shield_usp:[36,0,-.08,-.34],
 shield_glock18:[36,0,-.08,-.34],
 shield_p228:[36,0,-.08,-.34],
 shield_fiveseven:[36,0,-.08,-.34],
 shield_deagle:[36,0,-.08,-.34],
 shield_knife:[36,0,-.08,-.34],
 shield_hegrenade:[32,0,-.08,-.60],
 shield_flashbang:[32,0,-.08,-.60],
 shield_smokegrenade:[32,0,-.08,-.60],
 c4:[65,0,0,-.14],
 hegrenade:[65,0,0,-.17],
 flashbang:[65,0,0,-.16],
 smokegrenade:[65,0,0,-.17]
});

// The raised pose has a lower sight slot than the down pose. Move only the
// view camera during the authored transition; never the world camera or aim.
function shieldViewCameraY(subject){
 const data=subject?.userData;
 if(!data?.viewAsset?.startsWith('shield_'))return 0;
 const state=data.weaponAnimation||data.animation;
 const name=state?.activeName;
 if(name==='shield_idle')return -.08;
 if(name!=='shield_up'&&name!=='shield_down')return 0;
 const action=state.activeAction,duration=action?.getClip()?.duration||0;
 const progress=duration>0?Math.max(0,Math.min(1,action.time/duration)):1;
 return -.08*(name==='shield_up'?progress:1-progress);
}
