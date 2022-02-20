Parse.Cloud.beforeSave("Profile", async (request) => {
    const {object} = request;
    const count = await new Parse.Query("Profile")
        .equalTo("user", object.get('user'))
        .count({useMasterKey:true});
    if (count > 0){
        throw "INVALID_REQUEST";
    }
});
// Parse.Cloud.beforeDelete("Dialog", async (request) => {
//     const {object} = request;
//     if (object.get("state") > 0) {
//         throw "INVALID_REQUEST: state above 0";
//     }
// });