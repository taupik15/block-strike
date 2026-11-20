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
 // Shield rigs are mirrored as a whole by Phase13.applyHand. Keep the
 // shield-up centerline and remove the old rightward calibration offset.
 shield_usp:[75,0,-.16,-.34],
 shield_glock18:[75,0,-.16,-.34],
 shield_p228:[75,0,-.16,-.34],
 shield_fiveseven:[75,0,-.16,-.34],
 shield_deagle:[75,0,-.16,-.34],
 shield_knife:[75,0,-.16,-.34],
 shield_hegrenade:[65,0,-.16,-.60],
 shield_flashbang:[65,0,-.16,-.60],
 shield_smokegrenade:[65,0,-.16,-.60],
 c4:[65,0,0,-.14],
 hegrenade:[65,0,0,-.17],
 flashbang:[65,0,0,-.16],
 smokegrenade:[65,0,0,-.17]
});
