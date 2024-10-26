class AppError extends Error{

    constructor(message,statusCode){
        super (message); // seting up massga from parent class
        this.statusCode=statusCode;
        // this.message=message;
        this.status=`${statusCode}`.startsWith('4')?'fail':'error';
        this.isOperational=true;

        Error.captureStackTrace(this,this.constructor)
    }
}
//stack trace =>log(err.stack) this is used to find teh line where erroe is happend 
module.exports=AppError