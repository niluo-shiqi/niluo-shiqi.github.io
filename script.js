// APOD API JS

var today = new Date();
var tdd = String(today.getDate()).padStart(2, '0');
var tmm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var tyyyy = today.getFullYear();

today = tyyyy+ '-'+ tmm + '-' + tdd;

var fourDaysPrior = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
var sdd = String(fourDaysPrior.getDate()).padStart(2, '0');
var smm = String(fourDaysPrior.getMonth() + 1).padStart(2, '0'); //January is 0!
var syyyy = fourDaysPrior.getFullYear();

fourDaysPrior = syyyy+ '-'+ smm + '-' + sdd;



// function randomDate(start, end) {
//     return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
// }

// function APODRandomFromMonth() {
//     new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    
      
//       const d = randomDate(new Date(2012, 0, 1), new Date());
//       console.log(d);

// }







async function fetchAndPopulateAPOD() {
    try {
        const response = await fetch(`https://api.nasa.gov/planetary/apod?start_date=${fourDaysPrior}&end_date=${today}&api_key=${APOD_API_KEY}`);
        const data = await response.json();

        console.log("API Response:", data);
        let url = "";
        let explanation = "";
        const picArray = ["pic1", "pic2", "pic3", "pic4"];
        const capArray = ["cap1", "cap2", "cap3", "cap4"];

        // put images from past 7 days (APOD API) into slideshow
        for (let i = 0; i < data.length; i++) {
            url = data[i].url;
            let pic = document.getElementById(picArray[i]);
            if (pic) {
                pic.src = url;
            } else {
                console.error("pic element not found")
            }
            let cap = document.getElementById(capArray[i]);
            if (cap) {
                cap.innerText = "Generating poem...";
                explanation = data[i].explanation;
                cap.innerText = await generatePoem(explanation);
            } else {
                console.error("Error: caption element not found");
            }
        }
    } catch (error) {
        console.error("Error fetching or processing APOD API or OPENAI API", error);
    }
}





async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePoem(explanation, maxRetries=5, baseDelay=1000) {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            await delay(baseDelay * (2**retries)); // Exponential backoff attempt
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'o1-mini',  
                    messages: [
                        { "role": "user", "content": `Write a short 4 line poem based on this description, with easy vocabulary and making it easy to associate with the image: ${explanation}` }
                    ]
                })
            });
            if (response.status === 429) {
                console.warn('Rate limit hit. Retrying...');
                retries++;
                continue;
            }

            if (!response.ok) {
                console.error('Error:', response.statusText);
                return;  // Exit early if the response isn't ok
            }
        
            const data = await response.json();
            return data.choices[0].message.content;  // Extract the poem from the response

        } catch (error) {
            console.error('Error:', error);
            if (retries >= maxRetries - 1) throw new Error("Max retries reached.");
            retries++;
        }
    }
    
}
  

// On load, grab images from APOD and shuffle contents on page randomly

document.addEventListener("DOMContentLoaded", function () {
    fetchAndPopulateAPOD();
    shuffleImages();
    shufflePoems();

});



// Drag Logic

let currentDragged = null;
matches = {}; // Stores matched pairs
const correctMatches = { "pic1": "slot1", "pic2": "slot2", "pic3": "slot3", "pic4": "slot4"}; // Example correct answers

// Allow dropping
function allowDrop(event) {
    event.preventDefault();
    event.target.classList.add("drag-over");
}

function dragLeave(event) {
    event.target.classList.remove("drag-over");
}

// Handle drag start
function drag(event) {
    currentDragged = event.target.id;
    
}

// Handle drop
function drop(event) {
    event.preventDefault();
    event.target.classList.remove("drag-over");

    if (currentDragged) {
        // Prevent dropping onto another image
        if (event.target.tagName === "IMG") return;

        // Get the dragged image
        const draggedImg = document.getElementById(currentDragged);

        // If it's already inside another slot, move it back first
        const previousSlot = draggedImg.parentElement;
        if (previousSlot.classList.contains("poem-image-slot")) {
            previousSlot.innerHTML = ""; // Clear the previous slot
        }

        // Append image to new drop target
        event.target.appendChild(draggedImg);
        matches[currentDragged] = event.target.id; // Store match

        console.log(matches);
    }
}
document.querySelectorAll(".image-container").forEach(container => {
    container.ondragover = allowDrop;
    container.ondrop = function(event) {
        event.preventDefault();
        
        if (currentDragged) {
            const draggedImg = document.getElementById(currentDragged);

            // Find its old slot and clear it
            const previousSlot = draggedImg.parentElement;
            if (previousSlot.classList.contains("poem-image-slot")) {
                previousSlot.innerHTML = ""; // Clear slot
            }

            // Move image back to the original image container
            container.appendChild(draggedImg);
        }
    };
});


function checkMatches() {
    // Ensure that the number of matches is equal to the correct matches
    let matchesLength = Object.keys(matches).length;
    const correctMatchesLength = Object.keys(correctMatches).length;

    // Check if the number of keys match
    if (matchesLength !== correctMatchesLength) {
        console.log("wrong length");
        incorrectAnimation();
        return false;
    }

    // Go through each key in correctMatches and compare with matches
    for (let key in correctMatches) {
        // If the key is not in matches or the values don't match
        if (!(key in matches) || correctMatches[key] !== matches[key]) {
            console.log("wrong content");
            incorrectAnimation();
            return false;
        }
    }

    // If all checks pass, then it's correct
    console.log("correct!");
    confetti({
        particleCount: 200,
        spread: 360,
        origin: { y: 0.6 },
    });
    return true;
}


function incorrectAnimation() {
    let button = document.getElementById("shadow__btn");
    let errorMessage = document.getElementById("error-message");

    button.classList.add("shake");
    errorMessage.style.display = "inline"; // Show the message

    setTimeout(() => {
        button.classList.remove("shake");
        errorMessage.style.display = "none"; // Hide after animation
    }, 1000);
}



function shuffleImages() {
    const imagesContainer = document.querySelector(".images");
    const images = Array.from(imagesContainer.children);
    
    images.sort(() => Math.random() - 0.5); // Shuffle array randomly
    
    images.forEach(img => imagesContainer.appendChild(img)); // Reinsert in new order
}


function shufflePoems() {
    const poemsContainer = document.querySelector(".poems");
    const poems = Array.from(poemsContainer.children);

    poems.sort(() => Math.random() - 0.5); // Shuffle randomly

    poems.forEach(poem => poemsContainer.appendChild(poem)); // Reinsert in new order
}






