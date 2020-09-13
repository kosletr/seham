# Seham - Store Express HTTP Activity to MongoDB


# Motivation
The following node package was created for the scope of my Bachelor Thesis. 

Its purpose is not olny to provide a simple HTTP Logging function for Express APIs but also to give the web developer the ability to blacklist malicious/unwanted IPs. HTTP traffic as well as Client IPs are stored to different collections in a Mongo Database. Furthermore, this node package can be used in conjunction with a Python Flask API that leverages Machine Learning techniques to classify each client's behavior (as normal or abnormal) based on their logged HTTP activity/sessions. It may also be used to automaticaly blacklist clients if their activity/behavior is commonly classified as abnormal.

More specifically, this Node JS Middleware function can be used to:

- Log Client IPs (blacklistIP option available).
- Log HTTP Metadata into MongoDB.
- Group HTTP Metadata into Sessions based on timestamps.

If used in conjuction with the provided [Session Behavior Classifier API](https://github.com/kosletr/SessionBehaviorClassifierAPI),
it can also be used to:

- Extract Features from HTTP Metadata.
- Use Pretrained Python Classifiers to Classify Web
  Sessions and Blacklist Malicious IP Addresses.

## Prerequisites

- Node JS - as a Backend Service
- Express JS - REST API (express - node package)
- MongoDB - Database (mongoose - node package)

## Dependencies - Node Packages

- mime: ^2.4.6
- mongoose: ^5.10.3

## Usage

### Installation

Install the node package:

```
npm install seham
```

Require the module to your app:

```js
const seham = require("seham");
```

Insert the following line-of-code in your main file (app.js/index.js):

```js
app.use(seham(options)); 	// options argument is optional
```

between the lines:

```js
app.use(express.json());
... // code
/* INSERT THE LINE-OF-CODE HERE */
... // code
app.use(express.static(path.join(__dirname, "public")));
```

where `options` is a JavaScript Object with the properties listed below.

### Additional properties (Optional):

The various optional properties are listed below:

| Name             | Default          | Description      |
| ---------------- | ---------------- | ---------------- |
| `blockDuration`  |        60        | Duration (in seconds) that an IP Address gets blocked.|
| `groupToSessions`|       true       | Group HTTP to sessions based on time.|
| `custGroupToSess`| timestamp based  | Use a custom function to group HTTP into sessions.|
| `sessTimeThres`  |        15        | Maximum Time Difference (in seconds) between two consecutive requests of the same session. If Time Def greater than this value, requests are split into separate sessions.|
| `maxReqsPerSess` |        180       | Maximum Number of Requests in a session.|
| `pythonAPIOpt`   |         -        | Session-Behavior-Classifier-API Connection Options.|
| `customIPHeader` |         -        | The name of request-header to get the client IP from. If not provided common headers/request-properties are used instead.|

The default `pythonAPIOpt` object is shown below:

```js
pythonAPIOpt : {
  useAPI: false 		// Whether to use the Flask API (if available) or not.
  host: "localhost" 	// The Hostname of the Flask API.
  port: 4000 			// The Port number of the Flask API.
}
```

When the parameter `customIPHeader` is not provided then the headers and request properties listed above are used in the following order:

#### Request Headers:

```markdown
X-Client-IP
X-Forwarded-For
CF-Connecting-IP (Cloudflare)
Fastly-Client-Ip (Fastly CDN and Firebase hosting header when forwared to a cloud function)
True-Client-Ip (Akamai and Cloudflare)
X-Real-IP (Nginx proxy/FastCGI)
X-Cluster-Client-IP (Rackspace LB, Riverbed Stingray)
X-Forwarded
Forwarded-For
```

#### Request Properties:

```
req.connection.remoteAddress
req.socket.remoteAddress
req.connection.socket.remoteAddress
req.info.remoteAddress
```

An example of the `options` object could be:

```js
const options = {
        blockDuration : 24 * 60 * 60,     // 24 hours
        groupToSessions : true,
        sessTimeThres : 30,               // 30 seconds
        maxReqsPerSess : 200,             // 200 requests
        pythonAPIOpt : {useAPI: true, host: "localhost", port: 4000},
        customIPHeader : "Forwarded-IP"
}
```
