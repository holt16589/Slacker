import os

from flask import Flask, session, render_template, redirect, url_for, request, jsonify, flash
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = "this is a secret key"
socketio = SocketIO(app)
debug = True


#users stored on the server list
userList = []

#list of channels created, general channel created as default
channelList = ["general"]

#dict to store up to 100 messages per channel
#stores as {"channel": [username, message, timestamp]}
channelMessages = {"general": []}

@app.route("/", methods =['GET', 'POST'])
def index():
    return render_template("index.html")

#set up for user when a user initially logs in
@socketio.on("user login")
def user_login(data):
    username = data['displayname']
    selectedChannel = data['selectedChannel']
    userList.append(username)
    join_room(selectedChannel)
    emit ("update channel list", {"channelList": channelList})
    emit("display all channel messages", {"channelMessages": channelMessages[selectedChannel]})
    emit("channel welcome message", {"username": username}, broadcast=True)

#when a new channel is created by a user
@socketio.on("new channel")
def new_channel(data):
    channel_name = data['new channel'].lower()
    if channel_name not in channelList:
        channelList.append(channel_name)
        channelMessages[channel_name] = []
        emit("update channel list", {"channelList": channelList}, broadcast=True)
    else:
        error_message = "Error: Channel already exists!"
        emit("error", error_message)

#used when a user clicks a channel button to change channels
@socketio.on("change channel")
def change_channel(data):
    username = data['username']
    selectedChannel=data['selectedChannel']
    leave_room(data['previousChannel'])
    join_room(data['selectedChannel'])
    emit ("update channel list", {"channelList": channelList})
    emit("display all channel messages", {"channelMessages": channelMessages[selectedChannel]})
    emit("channel welcome message", {"username": username}, broadcast=True)

#used when a new message is sent in the channel
@socketio.on("new message")
def new_message(data):
    username = data['username']
    currentChannel = data['selectedChannel']
    messageContent = data['messageContent']
    timestamp = data['timeStamp']

#check to see if the channel message list has reached limit of 100
    if len(channelMessages[currentChannel]) >= 10:
        channelMessages[currentChannel].pop(0)

#display new message to all users in the applicable channel
    message = [username, messageContent, timestamp]
    channelMessages[currentChannel].append(message)
    emit("add new message", {"message": message}, channel= currentChannel, broadcast=True)
    return False

#used when an image is sent to a channel
@socketio.on("new image")
def new_image(data):
    username = data['username']
    currentChannel = data['selectedChannel']
    file = data['file']
    fileName = data['fileName']
    timeStamp = data['timeStamp']

    #validate file type, as only JPEG images are accepted
    if fileName[-4:] != '.JPG' and fileName[-5:] != '.JPEG' and fileName[-4:] != '.jpg' and fileName[-5:] != '.jpeg':
        error_message = "You must upload a JPG/JPEG image."
        emit("error", error_message)
        return False
    #display image to all users in the applicable channel
    emit("base64 image", {"username": username, "currentChannel": currentChannel, "file": file, "timeStamp": timeStamp}, broadcast=True)

if __name__ == '__main__':
    if debug:
        socketio.run(app, debug=True)
    else:
        socketio.run(app, debug=False)
