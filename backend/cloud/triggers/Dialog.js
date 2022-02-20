Parse.Cloud.beforeSave("Dialog", async (request) => {
    const {object} = request;
    object.get("user")
    const count = await new Parse.Query("Dialog")
        .equalTo("user", object.get("user"))
        .count({useMasterKey:true});
    if (count > 5){
        throw "INVALID_REQUEST";
    }
});
Parse.Cloud.beforeDelete("Dialog", async (request) => {
    const {object} = request;
    if (object.get("state") > 0) {
        throw "INVALID_REQUEST: state above 0";
    }
});