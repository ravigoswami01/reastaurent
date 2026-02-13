import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[
        {
            menuItemId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Menu',
                required:true
            },
            quantity:{
                type:Number,
                required:true
            }
        }
    ],
    totalPrice:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:["Pending", "In Progress", "Completed", "Cancelled"],
        default:"Pending"
    },
    assignedStaffId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    paymentStatus:{
        type:String,
        enum:["Pending", "Paid", "Failed"],
        default:"Pending"
    },
    createdAt:{
        type:Date,
        default:Date.now
    }

});

export default mongoose.model("Order",userSchema);