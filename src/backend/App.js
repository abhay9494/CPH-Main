import React, { Component } from 'react';
import productList from '../products.json';
import Service from '../Service/Service.js';

const styles = {
    div: {
        marginLeft: "100px",
        backgroundColor: "#00563B",
        maxHeight: "8em",
        width: "27%",
        color: "#DADD98"
    },
    // Fill the remaining styles
    dt: {
        color: "#000000",
        fontWeight: "700",
        backgroundColor: "#D1C1F8"
    },
    label: {
        fontWeight: "600",
        color: "#D0F0C0"
    },
    button: {
        marginLeft: "77.50%"
    },
    p: {
        fontWeight: "700",
        color: "#FFA07A"
    }
}

class DisplayProducts extends Component {
    cartHandler = (index) => {
        // Invoke addToCart function which is present inside Service.js file
        Service.addToCart(index);
    }

    render() {
        return (
            <div>
                {/* Implement your code here to read and display all the products from 'products.json' file */}
                {productList.products.map((product, index) => (
                    <div key={product.id} style={styles.div}>
                        <dl style={{fontWeight: "500"}}>
                            <dt style={styles.dt}>Product id: {product.id}</dt>
                            <dd style={styles.label}>Title: {product.title}</dd>
                            <dd style={styles.label}>Price: ${product.price}</dd>
                            <dd style={styles.label}>Available Size: 
                                {product.availableSizes.map((size, i) => (
                                    <td key={i}>{size}</td>
                                ))}
                            </dd>
                            <dd>
                                <button style={styles.button} onClick={this.cartHandler.bind(this, index)}>Add To Cart</button>
                            </dd>
                        </dl>
                    </div>
                ))}
                <p style={styles.p}>**Products cannot be returned nor exchanged once purchased.</p>
            </div>
        )
    }
}

export default DisplayProducts;