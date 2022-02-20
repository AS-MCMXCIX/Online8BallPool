Parse.Cloud.beforeSave("_User", async (request) => {
    const {object} = request;
    let Profile = Parse.Object.extend("Profile");
    let profile = new Profile();
    let id = await new Parse.Query("Avatar")
        .equalTo("name", object.get("avatar"))
        .first();
    id = id['id'];
    if (id) {
        let avatar = Parse.Object.extend("Avatar").createWithoutData(id);
        profile.set('avatar', avatar);
    } else {
        let avatar = Parse.Object.extend("Avatar").createWithoutData("Il164mZ9zA");
        profile.set('avatar', avatar);
    }
    object.unset('avatar');
    profile.save(null, {useMasterKey: true});
});
Parse.Cloud.afterSave("_User", async (request) => {
    const {object} = request;
    const profile = await new Parse.Query("Profile")
        .equalTo("user", undefined)
        .first();
    profile.set('user', object);
    profile.save(null, {useMasterKey: true});
});
Parse.Cloud.beforeDelete("_User", async (request) => {
    const {object} = request;
    const profile = await new Parse.Query("Profile")
        .equalTo("user", object)
        .find();

    if (profile.length > 0) {
        console.log(profile[0]);
        profile[0].destroy({useMasterKey: true}).then((myObject) => {
            console.log("Profile Deleted Successfully");
        }, (error) => {
            throw `Error Deleting Profile, Error: ${error}`
            // The delete failed.
            // error is a Parse.Error with an error code and message.
        });
    }
});