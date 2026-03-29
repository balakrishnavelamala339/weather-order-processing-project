require('dotenv').config();
const fs = require('fs').promises;
const axios = require('axios');

const API_KEY = process.env.OPENWEATHER_API_KEY;
console.log("API_KEY:",API_KEY)

const FILE_PATH = './orders.json';


function generateApology(customer, city, weatherCondition) {
    return `Hi ${customer}, your order to ${city} is delayed due to ${weatherCondition.toLowerCase()}.We appreciate your patience!`;
}

async function processOrders() {
    try {
        const data = await fs.readFile(FILE_PATH, 'utf8');
        let orders = JSON.parse(data);

        console.log("Starting parallel weather check...");

        //  Parallel Fetching using Promise.all
        const weatherPromises = orders.map(async (order) => {
            try {
                const response = await axios.get(
                    `https://api.openweathermap.org/data/2.5/weather?q=${order.city}&appid=${API_KEY}`
                );

                const weatherMain = response.data.weather[0].main;
                const delayConditions = ['Rain', 'Snow', 'Extreme'];
                
                if (delayConditions.includes(weatherMain)) {
                    order.status = "Delayed";
                    order.apology = generateApology(order.customer, order.city, weatherMain);
                    console.log( `Delay flagged for ${order.customer} in ${order.city} (${weatherMain})`);
                } else {
                    order.status = "On Time";
                }
            } catch (error) {
              //  Resilience & Error Handling
                if (order.city === "InvalidCity123" || error.response?.status === 404) {
                    console.error(`Error: City '${order.city}' not found. Skipping...`);
                    order.status = "Error: Invalid City";
                } else {
                    console.error(`Unexpected error for ${order.city}: ${error.message}`);
                }
            }
            return order;
        });

       // Wait for all concurrent API calls to finish
        const updatedOrders = await Promise.all(weatherPromises);

       
        await fs.writeFile(FILE_PATH, JSON.stringify(updatedOrders, null, 2));
        console.log("\n Processing complete. orders.json has been updated.");

    } catch (err) {
        console.error("Critical System Error:", err.message);
    }
}

processOrders();

