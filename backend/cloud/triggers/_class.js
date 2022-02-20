Parse.Schema.all()
    .then(res => {
        // add trigger
        res.forEach(collection => {
            const collectionName = collection.className;
            const isSystemCollection = false;
                // collectionName.startsWith("_") ||
                // collectionName.startsWith("t__") ||
                // collectionName.startsWith("yum__");
            if (!isSystemCollection) {
                console.log("Add class trigger: ", collectionName);
            }
        });
    })
    .catch(err => {
        console.log("Class trigger err: ", err);
    });
