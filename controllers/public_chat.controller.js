const ChatModel = require('../models/chat.model');
const mongoose = require('mongoose');

class Chat {
    constructor(io) {
        this.io = io;
        this.activeUsers = new Set(); // Track active users by socket ID

        // Listen for client connections
        this.io.on('connection', async (socket) => {
            // console.log('A user connected:', socket.id);
            this.activeUsers.add(socket.id); // Add the connected user
            this.emitActiveUsers(); // Emit the updated active user count

            // Send the last 100 messages to the newly connected client
            const recentMessages = await ChatModel.find()
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();
            socket.emit('load_previous_messages', recentMessages.reverse());

            // Listen for incoming messages
            socket.on('send_message', async (data) => {
                try {
                    // Validate message data
                    if (!data.username || !data.content) {
                        console.error('Invalid message format:', data);
                        return;
                    }

                    // Create a message object with all required fields
                    const messageData = {
                        username: data.username,
                        content: data.content,
                        vipLevel: data.vipLevel || 0, // Store VIP level directly
                        timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
                    };
                    // Save the message to the database
                    const newMessage = new ChatModel(messageData);
                    await newMessage.save();
                    // Broadcast the message to all connected clients
                    this.io.emit('receive_message', messageData);
                } catch (error) {
                    console.error('Error saving message:', error);
                    // Optionally notify the sender that the message failed to save
                    socket.emit('message_error', { error: 'Failed to save message' });
                }
            });

            // Handle user disconnect
            socket.on('disconnect', () => {
                console.log('A user disconnected:', socket.id);
                this.activeUsers.delete(socket.id); // Remove the disconnected user
                this.emitActiveUsers(); // Emit the updated active user count
            });
        });

        this.startSmartBot();
    }

    // Emit the active user count to all connected clients
    emitActiveUsers() {
        this.io.emit('active_users', this.activeUsers.size );
    }

    startSmartBot() {
        // 50 bot names with realistic human names
        const botNames = [
            'Emily', 'James', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Isabella', 'Lucas',
            'Mia', 'Ethan', 'Charlotte', 'Logan', 'Amelia', 'Benjamin', 'Harper', 'Jacob', 'Ella', 'Michael',
            'Scarlett', 'Alexander', 'Grace', 'Daniel', 'Chloe', 'Jack', 'Emma', 'Henry', 'Zoe', 'Samuel',
            'Layla', 'David', 'Ella', 'Matthew', 'Sofia', 'Jackson', 'Victoria', 'Sebastian', 'Penelope', 'Carter',
            'Riley', 'Wyatt', 'Lily', 'Julian', 'King makei', 'Nora', 'Levi', 'Hazel', 'Isaac', 'Aurora', 'Gabriel'
        ];
        // Add all bots to activeUsers set
        botNames.forEach(bot => this.activeUsers.add(`bot:${bot}`));
        this.emitActiveUsers();

        const emojis = [
            "😀", "😎", "🎉", "🍀", "🔥", "💰", "🥳", "👏", "😅", "🤞", "🤑", "😃", "🙌", "💸", "🎰", "🎲", "😇", "🤩", "😜", "😏"
        ];
        const responses = [
            { keywords: ['hello', 'hi', 'hey'], replies: ["Hello! 😊", "Hey there! 👋", "Hi, how can I help you? 😃"] },
            { keywords: ['win', 'winner', 'won'], replies: ["Congrats on your win! 🎉", "Nice win! 🤑", "You're on fire! 🔥"] },
            { keywords: ['lose', 'lost', 'rip'], replies: ["Better luck next time. 🍀", "Don't give up! 💪", "It happens to everyone. 😅"] },
            { keywords: ['luck', 'lucky'], replies: ["Good luck! 🤞", "May the odds be in your favor! 🍀", "Feeling lucky today? 😎"] },
            { keywords: ['game', 'play'], replies: ["Which game do you like most? 🎲", "I'm enjoying the games too! 😃", "Let's play together! 🕹️"] },
        ];
        const randomReplies = [
            "Anyone here from Europe? 🌍",
            "What's your favorite slot? 🎰",
            "Fairstakebet is the best! 😎",
            "Who's up for a challenge? 💪",
            "Big wins coming soon! 💰",
            "Who's feeling lucky? 🍀",
            "Let's keep the chat going! 💬",
            "Any tips for new players? 🤔",
            "I love this community! 🥰",
            "Who's on a winning streak? 🔥",
            "Just had a nice win! 🎉",
            "Anyone tried the new game? 🕹️",
            "Good vibes only! ✨",
            "Who's betting big tonight? 💸",
            "Let's see some jackpots! 🤑",
            "Who's up for some fun? 😜",
            "This chat is awesome! 🙌",
            "Feeling lucky today! 🍀",
            "Hope everyone is having a great day! 😃",
            "Let's make some memories! 📸",
            "Who's the luckiest here? 😏",
            "Any strategies to share? 🤓",
            "Let's keep spinning! 🎰",
            "Who's new here? 👋",
            "Fairstakebet rocks! 🤩",
            "Anyone watching sports tonight? ⚽",
            "Who's got a hot streak? 🔥",
            "Love the energy here! ✨",
            "Who's up for blackjack? 🃏",
            "Let's roll the dice! 🎲",
            "Who's feeling adventurous? 🚀",
            "Big win vibes! 💸",
            "Who's got a lucky charm? 🍀",
            "Let's celebrate! 🥳",
            "Who's your favorite dealer? 😎",
            "Any big wins to share? 🤑",
            "Who's playing slots? 🎰",
            "Who's ready for a bonus round? 🎁",
            "Let's go Fairstakebet! 🚀",
            "Who's betting next? 💵",
            "Who's here every night? 🌙",
            "Let's make it a lucky night! 🍀",
            "Who's got tips for roulette? 🎡",
            "Who's up for poker? ♠️",
            "Who's chasing jackpots? 💰",
            "Who's feeling bold? 😏",
            "Who's got the best luck? 🤞",
            "Who's new to Fairstakebet? 👋",
            "Who's your lucky friend? 👫",
            "Who's ready for fun? 😃"
        ];


        // Recursive function to send messages at random intervals
        const sendBotActivity = async () => {
            // Check if database is connected before querying
            if (mongoose.connection.readyState !== 1) {
                // Database not connected, retry after 2 seconds
                setTimeout(sendBotActivity, 2000);
                return;
            }
            
            const botName = botNames[Math.floor(Math.random() * botNames.length)];
            let lastMsg = null;
            try {
                lastMsg = await ChatModel.findOne().sort({ createdAt: -1 }).lean();
            } catch (error) {
                console.error('Error fetching last message for bot:', error.message);
                // Retry after 2 seconds if query fails
                setTimeout(sendBotActivity, 2000);
                return;
            }

            // Only reply to real users, not bots
            if (lastMsg && !botNames.includes(lastMsg.username)) {
                // Check for keywords
                let replied = false;
                for (const rule of responses) {
                    for (const keyword of rule.keywords) {
                        if (lastMsg.content && lastMsg.content.toLowerCase().includes(keyword)) {
                            let reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
                            reply += " " + emojis[Math.floor(Math.random() * emojis.length)];
                            await this.sendBotMessage(botName, reply);
                            replied = true;
                            break;
                        }
                    }
                    if (replied) break;
                }
                // Occasionally send a random message if no keyword matched
                if (!replied && Math.random() < 0.5) { // 50% chance for more activity
                    let reply = randomReplies[Math.floor(Math.random() * randomReplies.length)];
                    reply += " " + emojis[Math.floor(Math.random() * emojis.length)];
                    await this.sendBotMessage(botName, reply);
                }
            } else if (Math.random() < 0.8) { // 80% chance for more activity
                // If last message is from a bot or no messages, send a random message
                let reply = randomReplies[Math.floor(Math.random() * randomReplies.length)];
                reply += " " + emojis[Math.floor(Math.random() * emojis.length)];
                await this.sendBotMessage(botName, reply);
            }

            // Wait a random time between 1 and 5 seconds before next bot message (busier chat)
            const nextDelay = Math.floor(Math.random() * 4000) + 1000;
            setTimeout(sendBotActivity, nextDelay);
        };

        // Start the recursive bot activity
        sendBotActivity();
    }

    // Helper to send a bot message
    async sendBotMessage(username, content) {
        const messageData = {
            username,
            content,
            vipLevel: 0,
            timestamp: new Date()
        };
        const newMessage = new ChatModel(messageData);
        await newMessage.save();
        this.io.emit('receive_message', messageData);
    }
}

module.exports = Chat;