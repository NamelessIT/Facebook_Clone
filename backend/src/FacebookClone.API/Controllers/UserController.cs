using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Authorization;
using FacebookClone.API.Services;
using FacebookClone.Application.Auth.DTOs;
using FacebookClone.Application.Auth.Services;
namespace FacebookClone.API.Controllers
{
    [ApiController]
    [Route("api/v1/user")]
    public class UserController : ControllerBase
    {
        private readonly IAuthService _auth;

        public UserController(IAuthService auth)
        {
            _auth = auth;
        }


        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            return Ok("JWT works!");
        }     

        [HttpGet("profile")]
        public IActionResult Profile()
        {
            return Ok("Public profile works!");
        }

        [Authorize]
        [HttpGet("update")]
        public IActionResult Update()
        {
            return Ok("Update works!");
        }

    }
    
}