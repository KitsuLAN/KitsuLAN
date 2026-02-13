export namespace kitsulanv1 {
	
	export class Channel {
	    id?: string;
	    guild_id?: string;
	    name?: string;
	    type?: number;
	    position?: number;
	
	    static createFrom(source: any = {}) {
	        return new Channel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.guild_id = source["guild_id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.position = source["position"];
	    }
	}
	export class ChatMessage {
	    id?: string;
	    channel_id?: string;
	    author_id?: string;
	    author_username?: string;
	    author_avatar_url?: string;
	    content?: string;
	    created_at?: timestamppb.Timestamp;
	    edited_at?: timestamppb.Timestamp;
	
	    static createFrom(source: any = {}) {
	        return new ChatMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.channel_id = source["channel_id"];
	        this.author_id = source["author_id"];
	        this.author_username = source["author_username"];
	        this.author_avatar_url = source["author_avatar_url"];
	        this.content = source["content"];
	        this.created_at = this.convertValues(source["created_at"], timestamppb.Timestamp);
	        this.edited_at = this.convertValues(source["edited_at"], timestamppb.Timestamp);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Guild {
	    id?: string;
	    name?: string;
	    description?: string;
	    icon_url?: string;
	    owner_id?: string;
	    member_count?: number;
	    created_at?: timestamppb.Timestamp;
	
	    static createFrom(source: any = {}) {
	        return new Guild(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.icon_url = source["icon_url"];
	        this.owner_id = source["owner_id"];
	        this.member_count = source["member_count"];
	        this.created_at = this.convertValues(source["created_at"], timestamppb.Timestamp);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Member {
	    user_id?: string;
	    username?: string;
	    avatar_url?: string;
	    nickname?: string;
	    is_online?: boolean;
	    joined_at?: timestamppb.Timestamp;
	
	    static createFrom(source: any = {}) {
	        return new Member(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user_id = source["user_id"];
	        this.username = source["username"];
	        this.avatar_url = source["avatar_url"];
	        this.nickname = source["nickname"];
	        this.is_online = source["is_online"];
	        this.joined_at = this.convertValues(source["joined_at"], timestamppb.Timestamp);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace timestamppb {
	
	export class Timestamp {
	    seconds?: number;
	    nanos?: number;
	
	    static createFrom(source: any = {}) {
	        return new Timestamp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.seconds = source["seconds"];
	        this.nanos = source["nanos"];
	    }
	}

}

