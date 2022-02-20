Parse.Cloud.beforeSave("Avatar", async (request) => {
    const {object} = request;
    object.get("name");
    const count = await new Parse.Query("Avatar")
        .equalTo("name", object.get("name"))
        .count({useMasterKey:true});
    if (count > 0){
        throw `INVALID_REQUEST: Avatar with name \"${object.get("name")}\" already exists.`;
    }
});