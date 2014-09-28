require("cloud/app.js");

var Link = AV.Object.extend('Link');
var Tag = AV.Object.extend('Tag');
var UserLink = AV.Object.extend('UserLink');
var User = null ;

function getUser() {
    return AV.User.current();
}

/*获取远程标题*/
function getRemote(url, callback) {
    var cheerio = require('cheerio');
    AV.Cloud.httpRequest({
        url: url,
        success: function(httpResponse) {
            var $ = cheerio.load(httpResponse.text);
            var title = $('title').text();
            var desc = $('meta[name="description"]').attr('content');
            callback({
                title : title,
                desc : desc
            });
        }
    });
}
/*新增收藏记录*/
function addUserLink(args,callback) {
    var callback = callback || function () {} ;
    if (args.title == '' || args.url == '') {
        callback({
            ret : 'error',
            msg : '链接或标题不能为空'
        });
        return;
    }
    var query = new AV.Query(UserLink);
    query.equalTo('user', User);
    query.equalTo('url', args.url);
    query.first({
        success: function(link) {
            if (link) {
                callback({
                    ret : 'warning',
                    msg : '请勿重复收藏'
                });
                return;
            }

            var userLink = new UserLink();
            userLink.save({
                title: args.title,
                url: args.url,
                tag: args.tag,
                user: User
            }, {
                success: function(link) {
                    callback({
                        ret : 'success',
                        msg : '收藏成功'
                    });
                }
            });
        }
    })
}
/*新增链接*/
function addLink(args,callback) {
    var callback = callback || function () {} ;
    var query = new AV.Query(Link);
    query.equalTo('url',args.url);
    query.first({
        success:function (link) {
            if (link) {
                link.increment('count');
                link.save();
                callback({
                    ret : 'warning',
                    msg : '链接已存在'
                });
                return;
            }
            var link = new Link();
            link.save({
                title : args.title,
                url : args.url,
                count : 1
            },{
                success:function (link) {
                    callback({
                        ret : 'success',
                        msg : '添加链接成功'
                    });
                }
            });
        }
    })
}
/*新增标签*/
function addTag(tags,callback) {
    var callback = callback || function () {} ;
    var RelateTag = User.relation('tag');
    var tag_arr = tags.split(',');
    for (var i = 0 , len=tag_arr.length; i < len ; i++) {
        (function (m) {
            var name = tag_arr[m];
            var query = new AV.Query(Tag);
            query.equalTo('name',name);
            query.first({
                success:function (tag) {
                    if (tag) {
                        RelateTag.add(tag);
                        User.save();
                        callback({
                            ret : 'warning',
                            msg : '标签已存在'
                        });
                        return;
                    }

                    var tag = new Tag();
                    tag.save({
                        name : name
                    },{
                        success:function (tag) {
                            RelateTag.add(tag);
                            User.save();
                            callback({
                                ret : 'warning',
                                msg : '新增标签成功'
                            });
                        }
                    })
                }
            })
        })(i);
    }
}
/*获取标题*/
AV.Cloud.define('getTitle',function (req,rep) {
    var url = req.params.url;
    var query = new AV.Query(Link);
    query.equalTo('url',url);
    query.first({
        success:function (link) {
            if (link) {
                rep.success({
                    title : link.get('title'),
                    desc : link.get('desc')
                });
                return;
            }
            getRemote(url,function (data) {
                rep.success(data);
            })
        }
    });
});
/*注册*/
AV.Cloud.define('register', function(req, rep) {
    var postData = req.params;
    var user = new AV.User();
    user.signUp({
        username: postData.email,
        password: postData.password,
        email: postData.email
    }, {
        success: function(user) {
            rep.success({
                ret: 'success',
                msg: '注册成功！'
            });
        },
        error: function(user, error) {
            rep.error(error);
        }
    });
});
/*添加收藏*/
AV.Cloud.define('addLink',function (req,rep) {
    var postData = req.params;
    addUserLink(postData,function () {
        rep.success({
            ret : 'success',
            msg : '收藏成功'
        })
    });
    addLink({
        title : postData.title,
        url : postData.url
    });
    addTag(postData.tag);
})
/*获取当前用户的收藏*/
AV.Cloud.define('getLink',function (req,rep) {
    var query = new AV.Query(UserLink);
    User = req.user;
    query.equalTo('user',User);
    query.find({
        success:function (data) {
            rep.success(data);
        },
        error:function (error) {
            rep.error(error);
        }
    })
})
/*删除收藏*/
AV.Cloud.define('deleteLink',function (req,rep) {
    var id = req.params.id;
    var query = new AV.Query(UserLink);
    query.get(id,{
        success:function (link) {
            link.destroy({
                success:function () {
                    rep.success({
                        ret : 'success',
                        msg : '删除成功'
                    })
                }
            })
        }
    })
})