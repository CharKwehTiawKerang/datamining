const PORT = process.env.PORT || 3000
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const app = express()

const fs = require('fs')
const writeStream = fs.createWriteStream('recipe.csv')

//write headers
writeStream.write(`Title, Image, Link URL, Size, Prep Time, Cook Time, Total Time, Ingredients, Instructions \n`)

//list of array objects
const data = [
    {
        name: 'rasamalaysia',
        address: 'https://rasamalaysia.com/recipes/malaysian-recipes/',
        base: ''
    },
]

const pages = []
const recipes = []
const specificPages = []
const specificRecipes = []


//scraping pages
data.forEach(obj => {
    axios.get(obj.address)
        .then(response => {
            const html = response.data
            const $ = cheerio.load(html)
            
            $('a.entry-title-link', html).each(function() {
                const title = $(this).text()
                const url = $(this).attr('href')

                pages.push({
                    title,
                    url: url,
                    source: obj.name
                })
            })

            for(const i in pages) {
                pages[i] = Object.assign({id: i}, pages[i])
            }
        })
})
    

//routing
app.get('/', (req, res) => {
    res.json('Malaysian Food Recipes API')
})

// app.get('/pages', (req, res) => {
//     res.json(pages)
// })

app.get('/recipes', (req, res) => {

    pages.forEach(page => {
        axios.get(page.url)
            .then(response => {
                const html = response.data
                const $ = cheerio.load(html)
    
                //rasamalaysia page
                $('.mv-create-wrapper', html).each(function() {
                    const title = page.title
                    const url = page.url
                    const img = $(this).find('img').attr('data-src')
                    const size = $('.mv-create-yield').text()
                    const prepTime = $('.mv-create-time-prep .mv-time-part').text()
                    const cookTime = $('.mv-create-time-active .mv-time-part').text()
                    const totalTime = $('.mv-create-time-total .mv-time-part').text()

                    // const ingredients = $('.mv-create-ingredients ul li').text().replace(/\s\s+/g, ' ').split(" ")
                    // const ingredients = $('.mv-create-ingredients ul li').text().replace(/["]+/g, '').split(/\s\s+/g)
                    const ingredients = $('.mv-create-ingredients ul li').text().replace(/[,]/g, '').replace(/\s\s+/g, '.') 

                    //remove noscript tags
                    $('noscript').remove()
                    const instructions = $('.mv-create-instructions ol li').text().replace(/["]+/g, '"').split(". ")

                    // recipes.push({
                    //     title: page.title,
                    //     url: page.url, //will remove soon
                    //     img: img,
                    //     size: size,
                    //     prepTime: prepTime,
                    //     cookTime: cookTime,
                    //     totalTime: totalTime,
                    //     ingredients,
                    //     instructions
                    // })

                    //write data to CSV
                    writeStream.write(`${title}, ${url}, ${img}, ${size}, ${prepTime}, ${cookTime}, ${totalTime}, ${ingredients}, ${instructions}\n`)

                    console.log('Scraping Done...')

                    //remove and repair problem recipe
                    recipes.forEach((recipe, i) => {
                        const halalOnly = recipe.ingredients.join()
                        const checkingredients = recipe.ingredients
                        const checkTitle = recipe.title
                        const checkCookTime = recipe.cookTime
                        const checkTotalTime = recipe.totalTime

                        if(halalOnly.includes("pork")) {
                            recipes.splice(i, 1)
                        }

                        if(checkingredients.includes("1")) {
                            recipes.splice(i, 1)
                        }

                        if(checkTitle.includes("Kaya Toast")) {
                            recipes.splice(i, 1)
                        }

                        if(checkTitle.includes("Nasi Ulam")) {
                            recipes.splice(i, 1)
                        }

                        //repair time
                        if(checkCookTime.match(/hour\d/g)) {
                            const minute = recipe.cookTime.substr(6)
                            const hour = recipe.cookTime.substr(0, 6)
                            const newTime = hour + ' ' + minute
                            
                            recipe.cookTime = newTime
                        }

                        if(checkCookTime.match(/hours\d/g)) {
                            const minute = recipe.cookTime.substr(7)
                            const hours = recipe.cookTime.substr(0, 7)
                            const newTime = hours + ' ' + minute
                            
                            recipe.cookTime = newTime
                        }

                        if(checkTotalTime.match(/hour\d/g)) {
                            const minute = recipe.totalTime.substr(6)
                            const hour = recipe.totalTime.substr(0, 6)
                            const newTime = hour + ' ' + minute
                            
                            recipe.totalTime = newTime
                        }

                        if(checkTotalTime.match(/hours\d/g)) {
                            const minute = recipe.totalTime.substr(7)
                            const hours = recipe.totalTime.substr(0, 7)
                            const newTime = hours + ' ' + minute
                            
                            recipe.totalTime = newTime
                        }
                    })

                    
                })
                
            })

            //function to add id for each object
            for(const i in recipes) {
                recipes[i] = Object.assign({id: i}, recipes[i])
            }
    })

    res.json(recipes)
})

app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`))