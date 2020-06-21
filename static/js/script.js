document.addEventListener('DOMContentLoaded', () => {

  //disable the create new channel button by default
  document.querySelector('#add_channel_button').disabled = true;

//set selected channel to general by default if not already stored
var selectedChannel = localStorage.getItem('selectedChannel');
if (!selectedChannel){
  localStorage.setItem('selectedChannel', 'general');
}

    // Connect to websocket
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {

      //config send message button
      document.querySelector('#send-btn').disabled = true;

      //config modal button to disabled until valid entry is input
      document.querySelector('#get-started-btn').disabled = true;

      //if the user is a new user, display the modal to set a display name
       if (!localStorage.getItem('username')) {
         $('#modal-username').modal({backdrop: 'static', keyboard: false});

         //validate length of the user entry for displayname
         document.querySelector('#username-input').onkeyup = () => {
             if (document.querySelector('#username-input').value.length > 2 && document.querySelector('#username-input').value.length < 12){
                 document.querySelector('#get-started-btn').disabled = false;
               }
             else{
                 document.querySelector('#get-started-btn').disabled = true;}
         };

         //once get started is clicked, validate that the enetered display name does not include any special characters or spaces
         document.querySelector('#get-started-btn').onclick = () => {
           var displayname = document.querySelector('#username-input').value;
           document.querySelector('#username-input').value = '';
           var pattern = new RegExp(/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/); // use regular expression to check for unacceptable chars
           if (pattern.test(displayname) || displayname.includes(" ")) {
           alert("Error: Your display name cannot include spaces or special characters.");
         }
           else{
             //if user input looks good, update local storage, generate the display name on the page and hid the modal
             localStorage.setItem('username', displayname);
             document.getElementById("side-avatar").src = "https://api.adorable.io/avatars/285/" + displayname + ".png";
             document.querySelector('#welcome-message').innerHTML = localStorage.getItem('username');

             //hide modal window once input is recieved
             $('#modal-username').modal('hide');

             //setup initial user login by storing the display name and joining the room for the selected channel on the server side
             socket.emit('user login', {'displayname': displayname, 'selectedChannel': localStorage.getItem('selectedChannel')});
             return false;
           }
         };
       }
       else{
         //if the user is returning, modal does not need to be displayed and can go straight to setup
         document.querySelector('#welcome-message').innerHTML = localStorage.getItem('username');
         socket.emit('user login', {'displayname': localStorage.getItem('username'), 'selectedChannel': localStorage.getItem('selectedChannel')})
       }

       //only enable the create new channel button when a minimum of 3  characters are entered
       document.querySelector('#input_new_channel').onkeyup = () => {
           if (document.querySelector('#input_new_channel').value.length > 2){
               document.querySelector('#add_channel_button').disabled = false;
             }
           else{
               document.querySelector('#add_channel_button').disabled = true;
             }
       };


       //when button is clicked, emit the channel_name and clear the input field. return false to prevent form submit.
           document.querySelector('#add_channel_button').onclick = () => {
             const channel_name = document.querySelector('#input_new_channel').value;
             document.querySelector('#input_new_channel').value = '';
             socket.emit('new channel', {'new channel': channel_name});
             return false;
           };

           //check input for send message field, needs to have at least 1 character
           document.querySelector('#message-input').onkeyup = (key) => {
               if (document.querySelector('#message-input').value.length > 0){
                   document.querySelector('#send-btn').disabled = false;
                 }
               else{
                   document.querySelector('#send-btn').disabled = true;
                 }
                 if (key.keyCode==13) {
                     document.querySelector('#send-btn').click();
                 }
               };

               //when user presses send button to send message.
                   document.querySelector('#send-btn').onclick = () => {
                     const user_message = document.querySelector('#message-input').value;
                     document.querySelector('#message-input').value = '';

                     //generate the timestamp for each sent emssage
                     var currentTime = timeStamp();
                     socket.emit('new message', {'username': localStorage.getItem('username'), 'selectedChannel': localStorage.getItem('selectedChannel'), 'messageContent': user_message, 'timeStamp': currentTime})
                     return false;
                   };

                   //enable the button to send images
                   document.querySelector('#upload-btn').onclick = () => {
                     $('#modal-file').modal();
                     return false;
                   };

    //recieve user uploaded image
    $('#upload-image').bind('change', function (e) {
      var data = e.originalEvent.target.files[0];
      readThenSendFile(data);
    });

        }); //end of on connect

        //updates the channel list on the sidebar when a new channel is added
        socket.on('update channel list', data => {
          const channels = document.querySelector('#channel-list');
          var selectedChannel = localStorage.getItem('selectedChannel');

          //remove existing items from channel list
          while (channels.firstChild) {
              channels.removeChild(channels.firstChild);
          }
          //refresh channel list with updated list of channels
             for(channel of data['channelList']){
               const li = document.createElement('li');
               li.chn = channel;
               li.onclick = function() {
                 if (li.chn !== selectedChannel) {
                     const previousChannel = selectedChannel;
                     localStorage.setItem('selectedChannel', li.chn);
                     socket.emit('change channel', {'selectedChannel': li.chn, 'previousChannel': previousChannel, 'username': localStorage.getItem('username')});
                 }
               };

               //mark the current selected channel as active for styling
                 if(channel == selectedChannel){
                  li.innerHTML = '<a href="#" class="active" aria-expanded="true">#' + channel + "</a>";
                  }
                  else{
                  li.innerHTML = '<a href="">#' + channel + "</a>";
                  }
                  document.getElementById("channel-list").appendChild(li);
                  document.getElementById("side-avatar").src = "https://api.adorable.io/avatars/285/" + localStorage.getItem('username') + ".png";
              }
        });

        //when a channel is selected, display all messages in the channel
        socket.on('display all channel messages', data =>{

          //remove existing messages in the DOM
          const messageList = document.querySelector('#messages-list');
            while (messageList.firstChild) {
                messageList.removeChild(messageList.firstChild);
              }

            //display all messages in the current selected channel
            for(message of data['channelMessages']){
              const li = document.createElement('li');
              li.className = 'media my-3';

//use the Anchorme JS library to identify any URLs in the message and convert to a link
//https://alexcorvi.github.io/anchorme.js/
              const input = message[1]
              const urlChecked = anchorme({
    input,
    //this attribute is used so that the link is opened in a new tab
    options: {
        attributes: {
            target: "_blank",
        },
    }
});
              li.innerHTML = "<img src=\"https://api.adorable.io/avatars/80/" + message[0] + ".png\" class=\"mr-3\" alt=\"\" />" +
              "<div class=\"media-body\">" + "<h5 class=\"mt-0 mb-1\">" + message[0] + " <small class=\"text-muted\"> " + message[2] + "</small></h5>" + urlChecked + "</div>"
              document.getElementById("messages-list").appendChild(li)
            }
            //scroll to bottom once messages are added
            scrollBottom();

        });

        //add single new message when a user sends a message
        socket.on('add new message', data =>{
          var message = data['message']
          const messageList = document.querySelector('#messages-list');
          const li = document.createElement('li');

//use the Anchorme JS library to identify any URLs in the message and convert to a link
//https://alexcorvi.github.io/anchorme.js/
          const input = message[1]
          const urlChecked = anchorme({
input,
options: {
    attributes: {
      //this attribute is used so that the link is opened in a new tab
        target: "_blank",
    },
}
});

          li.className = 'media my-3';
          li.innerHTML = "<img src=\"https://api.adorable.io/avatars/80/" + message[0] + ".png\" class=\"mr-3\" alt=\"\" />" +
          "<div class=\"media-body\">" + "<h5 class=\"mt-0 mb-1\">" + message[0] + " <small class=\"text-muted\"> " + message[2] + "</small></h5>" + urlChecked + "</div>"
          document.getElementById("messages-list").appendChild(li)
          scrollBottom();
        });

//sends a message to entire channel to indicate a user has joined the channel
        socket.on('channel welcome message', data =>{
        var username = data['username'];
        const messageList = document.querySelector('#messages-list');
        const li = document.createElement('li');
        li.className = 'my-2 text-center';
        li.innerHTML = "<p>" + username + " joined the channel! </p>"
        document.getElementById("messages-list").appendChild(li)
        scrollBottom();
        });

        //produce error as an alert
      socket.on('error', data => {
          alert(data);
          });

//display base64 image in the channel
          socket.on('base64 image', data =>{
            $('#modal-file').modal('hide');
            var message = data['message']
            const messageList = document.querySelector('#messages-list');
            const li = document.createElement('li');
            li.className = 'media my-3';
            li.innerHTML = "<img src=\"https://api.adorable.io/avatars/80/" + data.username + ".png\" class=\"mr-3\" alt=\"\" />" +
            "<div class=\"media-body\">" + "<h5 class=\"mt-0 mb-1\">" + data.username + " <small class=\"text-muted\"> " + data.timeStamp + "</small></h5>" + "<img src=\"" + data.file +"\" class=\"mt-3 userImage\" alt=\"\" />" + "</div>"
            document.getElementById("messages-list").appendChild(li)
            scrollBottom();
          });

//generate a user-readable timestamp for all messages
      function timeStamp () {
          var currentDate = new Date();
          var date = currentDate.getDate();
          var month = currentDate.getMonth(); // months start at 0, not 1 (i.e. jan= month 0)
          var year = currentDate.getFullYear();
          var hour = currentDate.getHours();
          var mins = currentDate.getMinutes()
          var fixedMins = mins;

//if the number of minutes is single digit, append a 0 to ensure 1:05PM does not display as 1:5PM for example
          if(mins.toString().length == 1){
            fixedMins = "0" + mins
          }

          const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
          var period = 'AM';

          //hour returns in 24-hour format, check to convert to half day format
          if(hour > 12){
          hour = hour - 12;
          period = 'PM';
          }
          if(hour == 12){
            period = 'PM';
          }
          return (monthNames[month] + ' ' + date + ', ' + year + ', ' + hour + ":" + fixedMins + ' ' + period);
          }

          function scrollBottom() {
            window.scrollTo(0,document.querySelector("#messages-body").scrollHeight);
          }
//function used to read file for image upload
          function readThenSendFile(data) {

          var reader = new FileReader();
          reader.onload = function (evt) {
          var currentTime = timeStamp();
          socket.emit('new image', {'username': localStorage.getItem('username'), 'selectedChannel': localStorage.getItem('selectedChannel'), 'file': evt.target.result, 'fileName': data.name, 'timeStamp': currentTime})
          };
          reader.readAsDataURL(data);
          reader.onerror = function () {
          alert("Error: File too large.");
          };

          }


    });
