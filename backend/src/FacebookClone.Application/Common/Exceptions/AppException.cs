namespace FacebookClone.Application.Common.Exceptions;
using System;


    public class AppException : Exception
{
    public int StatusCode { get; }
    public string ErrorCode { get; }

    public AppException(
        string message,
        string errorCode = "APP_ERROR",
        int statusCode = 400
    ) : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }
}
