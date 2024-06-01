let code = `
[Constants]
global $active = 0

global $width
global $height
global $offset_x
global $offset_y

global $cursor_x
global $cursor_y

global $menu = 0

[Present]
if $menu
    $cursor_x = cursor_screen_x/rt_width
    $cursor_y = cursor_screen_x/rt_width
    
    run = CommandListMain
endif

post $menu = 0

[KeyMenu]
condition = $active == 1
key = m
type = cycle
$menu = 0,1

[CustomShaderDraw]
local $x87 = x87
local $y87 = y87
local $z87 = z87
local $w87 = w87

x87 = $width
y87 = $height
z87 = $offset_x
w87 = $offset_y

cs = shader.hlsl
vs = shader.hlsl

x87 = $x87
y87 = $y87
z87 = $z87
w87 = $w87

clear = ps-t100

`;

let ignore_variables = ['$wheel_', '$variable', '$off_', '$Key', 'RGB_'];

let toggle_variables;

let element_number = 1;

let rt_width = 'rt_width*';
let rt_height = 'rt_height*';

let res_width = window.screen.width;
let res_height = window.screen.height;

let move = false;

let edit_mode = 0;

let elements = [];

let IniContent = ``;
let SlidersCount = -1, TogglesCount = -1;
let StaticSlidersCount = -1, StaticTogglesCount = -1;

let menu = false;


function RenderText() {
    const ctx = document.getElementsByTagName("canvas")[0].getContext("2d");

    ctx.clearRect(0, 0, 128, 32);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = "20px serif";
    ctx.textAlign = 'center'
    ctx.fillText($('input[name="CanvasText"]').val(), 64, 24);
  }


function SaveTextAsImage(){
    const canva = document.getElementsByTagName('canvas')[0];
    const ctx = canva.getContext("2d");
    let input_text = $('input[name="CanvasText"]').val();

    ctx.clearRect(0, 0, 128, 32);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = "20px serif";
    ctx.textAlign = 'center'
    ctx.fillText(input_text, 64, 24);

    let canvasImage = canva.toDataURL('image/png');


    let xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function () {
        let a = document.createElement('a');
        a.href = window.URL.createObjectURL(xhr.response);
        a.download = input_text+'.png';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
    xhr.open('GET', canvasImage);
    xhr.send();
   
   
    RenderText();
}

function HowManySliders(){
    if(SlidersCount == -1){
        SlidersCount = (IniContent.match(/\$selector = .+/gm)[1]) ?? '';  
        SlidersCount = parseInt(SlidersCount.match(/\d+$/gm)) ?? 0;
        StaticSlidersCount = SlidersCount;
    }

    if(SlidersCount > 0 || (SlidersCount == 0 && document.getElementsByTagName('h2').length > 0))
        if(document.getElementsByTagName('h2').length == 0)
            $('input[name="ini"]').before(`<h2 style='color: Red;'>${SlidersCount} Sliders Required</h2>`);
        else
            SlidersCount == 0 ? (document.getElementsByTagName('h2')[0].innerHTML = SlidersCount+' Sliders Required', document.getElementsByTagName('h2')[0].style.color = 'Green') : document.getElementsByTagName('h2')[0].innerHTML = SlidersCount+' Sliders Required';

}


function PrintToggles(){
    if($('h3').length != 0){
        $("table#Toggles").html('');
        if($('table#Toggles').length == 0)
            $('h3').after("<table id='Toggles' style='color: Orange; text-align: Center; margin: Auto;'></table></br>");

        toggle_variables.forEach((toggle, index) =>{
            $("table#Toggles").append(`<tr><td>${toggle}</td></tr>`);
        }); 
    }
}

$(document).on('click', 'table#PotentialToggles >> td', function(){

    if($(this).hasClass("AddToCount")){
        $(this).removeClass("AddToCount")
        TogglesCount--;
        delete toggle_variables[toggle_variables.indexOf($(this).text())];
    }

    else{
        $(this).addClass("AddToCount");
        TogglesCount++;
        toggle_variables.push($(this).text());
    }

    StaticTogglesCount = TogglesCount;
    HowManyToggles();
});

function IgnoreVariables(variable){
    return ignore_variables.every((ignore_variable, index) =>{
        return !(variable.indexOf(ignore_variable) != -1);
    });
}



function HowManyToggles(){
    let Variables;

    if(TogglesCount == -1){
        TogglesCount = (IniContent.match(/(global persist \$variable\d+)/gm).length) ?? 0;

        toggle_variables = IniContent.match(/(global persist \$variable\d+)/gm).join(' ').match(/(\$\S+)/gm);

        Variables = IniContent.match(/(global persist \$.+)/gm) ?? 0;
        if(Variables.length > 0){
            Variables = Variables.join(' ').match(/(\$\S+)/gm);
            $('body').append('<table id="PotentialToggles" style="background-color: RGBA(0, 0, 0, 0.75); color: White; position: absolute; z-index: 9999; right: 0%"></table>');
                Variables.forEach((variable, index) =>{
                    if(IgnoreVariables(variable)){
                        $('table#PotentialToggles').append(`<tr><td>${variable}</td></tr>`);
                    }
                });
        }
        
        StaticTogglesCount = TogglesCount;
    }

    if(TogglesCount > 0 || (TogglesCount == 0 && document.getElementsByTagName('h3').length > 0))
        if(document.getElementsByTagName('h3').length == 0)
            $('input[name="ini"]').before(`<h3 style='color: Yellow;'>${TogglesCount} Toggle Icons Recommended</h3>`);
        else
            TogglesCount == 0 ? (document.getElementsByTagName('h3')[0].innerHTML = TogglesCount+' Toggle Icons Recommended', document.getElementsByTagName('h3')[0].style.color = 'Green') : document.getElementsByTagName('h3')[0].innerHTML = TogglesCount+' Toggle Icons Recommended';

    PrintToggles();
}

async function AddElement(width = 0, height = 0, offset_x = 0, offset_y = 0, image = '', background_image = '', type='Visual'){

    function getMeta(imageSrc,callback) {
        var img = new Image();
        img.src = image;
        img.onload = function() { callback(this.width, this.height); } 
    }

    if(width == 0)
        await new Promise((resolve, reject) => {
            getMeta(image, function (localWidth, localHeight) { width = localWidth;  resolve(); });
        });

    if(height == 0)
        await new Promise((resolve, reject) => {
            getMeta(image, function (localWidth, localHeight) { height = localHeight;  resolve(); });
        });

    
    if (background_image != ''){
        elements[element_number] = {'header' : `[CommandListElement${element_number}]`,
        'background_width' : parseInt(width),
        'background_height' : parseInt(height),
        'background_offset_x' : parseInt(offset_x),
        'background_offset_y' : parseInt(offset_y),
 
        'background_draw' : `ps-t100 = ResourceElementBackground${element_number}
run = CustomShaderDraw`,
        
        'width' : parseInt(width),
        'height' : parseInt(height),
        'offset_x' : parseInt(offset_x),
        'offset_y' : parseInt(offset_y),
 
        'draw' : `ps-t100 = ResourceElement${element_number}
run = CustomShaderDraw`,
    
        'type' : type
        };

        $('body').append(`<div id='Element${element_number}_Background' style='overflow: hidden; background-image: url(${background_image}); width: ${width}px; height: ${height}px; position: absolute; left: ${offset_x}px; top: ${offset_y}px'><div id='Element${element_number}' style='background-image: url(${image}); background-position: center; background-size: contain; background-repeat: no-repeat; width: ${width}px; height: ${height}px; position: absolute;' class='Element'></div></div>`);
    }

    else{
        elements[element_number] = {'header' : `[CommandListElement${element_number}]`,
        'width' : parseInt(width),
        'height' : parseInt(height),
        'offset_x' : parseInt(offset_x),
        'offset_y' : parseInt(offset_y),
 
        'draw' : `ps-t100 = ResourceElement${element_number}
run = CustomShaderDraw`,

        'type': type
        };

       $('body').append(`<div id='Element${element_number}' class='Element' style='background-image: url(${image}); background-position: center; background-size: contain; background-repeat: no-repeat; width: ${width}px; height: ${height}px; position: absolute; left: ${offset_x}px; top: ${offset_y}px'></div>`);
    }

    if(type == 'Slider' && SlidersCount > 0){
        SlidersCount--;   
        HowManySliders();
    }

    if(type == 'Toggle' && TogglesCount > 0){
        TogglesCount--;   
        HowManyToggles();
    }

    element_number++;
};

function AddResource(image = '', background_image = ''){
    if(background_image != '')
        code += `[ResourceElementBackground${element_number}]
        filename = ${background_image.files[0].name}`;
        
    code += `ResourceElement${element_number}]
    filename = ${image.files[0].name}`;
}

function ClampWidth(){
    if($('input[name="width"]').val() > res_width)
        $('input[name="width"]').val(res_width);
}

function ClampHeight(){
    if($('input[name="height"]').val() > res_height)
        $('input[name="height"]').val(res_height);
}


function Main(){
    //, URL.createObjectURL($('input[name="image"]')[0].files[0]), URL.createObjectURL($('input[name="background_image"]')[0].files[0] ?? '')
//console.log($('input[name="image"]')[0].files[0], $('input[name="background_image"]')[0].files[0] != undefined ? URL.createObjectURL($('input[name="background_image"]')[0].files[0]) : '');
        AddElement($('input[name="width"]').val(), $('input[name="height"]').val(), $('input[name="offset_x"]').val(), $('input[name="offset_y"]').val(), URL.createObjectURL($('input[name="image"]')[0].files[0]), $('input[name="background_image"]')[0].files[0] != undefined ? URL.createObjectURL($('input[name="background_image"]')[0].files[0]) : '', $('option:selected').val());


        // AddResource();

           /* case 2:
           /*     $('input').attr('max', window.screen.width);
           /*     break;    
           /* case 3:
           /*     $('input').attr('max', window.screen.width);
           /*     break;    
           /* case 4:
           /*     $('input').attr('max', window.screen.width);
           /*     break;*/
}

function Init(){
    //for(let input = 0; input <= 4; input++)
    //    switch(input){
    //        case 0:
                $('form').find('input').eq(0).attr('max', res_width);
            //    break;
           // case 1:
                $('form').find('input').eq(1).attr('max', res_height);
           //     break;
       // };
}

function ReSize(element, isParent){
    let x, y;

    if(isParent)
        switch(edit_mode){
            case 1:
                x = $(element).children().eq(0).css('width');
                y = $(element).children().eq(0).css('height');
                break;
            default:
                x = $(element).css('width');
                y = $(element).css('height');
                break;
        }

    else
        switch(edit_mode){
            case 1:
                x = $(element).css('width');
                y = $(element).css('height');
                break;
            default:
                x = $(element).parent().eq(0).css('width');
                y = $(element).parent().eq(0).css('height');
                break;
        }

 

    $('input[type="range"]').remove();
    $('label.SliderLabel').remove();
    $('output').remove();
    $(element).after(`<div id='slider-container' style="background-image: url('backgroundDefault.png'); color: lime; font-size: large; accent-color: lime; text-align-last: center; position: absolute; z-index: 9999;"><label for='ChangeSizeX' class='SliderLabel'>Size X</label><input name='ChangeSizeX' type='range' min='1' max='${res_width}' value='${x}' oninput='this.nextElementSibling.value = this.value'/><output></output></br><label for='ChangeSizeY' class='SliderLabel'>Size Y</label><input type='range' name='ChangeSizeY' min='1' max='${res_height}' value='${y}' oninput='this.nextElementSibling.value = this.value'/><output></output></div>`);

    $('input[type="range"]').on('input', function(){
        let localWidth = $('input[name="ChangeSizeX').val();
        let localHeight = $('input[name="ChangeSizeY').val();

        let currentID = $(element).attr('id').match(/\d+/gim)[0];


        if(isParent)
            switch(edit_mode){
                case 1:
                    $(element).children().eq(0).css('width', localWidth).css('height',localHeight);
                    elements[currentID].width = localWidth;
                    elements[currentID].height = localHeight;
                    break;

                case 2:
                    $(element).css('width', localWidth).css('height', localHeight);
                    elements[currentID].background_width = localWidth;
                    elements[currentID].background_height = localHeight;
                    break;

                case 3:
                    $(element).css('width', localWidth).css('height', localHeight);
                    elements[currentID].background_width = localWidth;
                    elements[currentID].background_height = localHeight;

                    $(element).children().eq(0).css('width', localWidth).css('height',localHeight);
                    elements[currentID].width = localWidth;
                    elements[currentID].height = localHeight;
                    break;
                default:

                    return;
            }
        else

        switch(edit_mode){
            case 1:
                $(element).css('width', localWidth).css('height',localHeight);
                elements[currentID].width = localWidth;
                elements[currentID].height = localHeight;
                break;

            case 2:
                $(element).parent().eq(0).css('width', localWidth).css('height', localHeight);
                elements[currentID].background_width = localWidth;
                elements[currentID].background_height = localHeight;
                break;

            case 3:
                $(element).css('width', localWidth).css('height', localHeight);
                elements[currentID].width = localWidth;
                elements[currentID].height = localHeight;

                $(element).parent().eq(0).css('width', localWidth).css('height',localHeight);
                elements[currentID].background_width = localWidth;
                elements[currentID].background_height = localHeight;
                break;

            default:
                return;
        }
  


        //console.log(elements, $(element), currentID);

       // console.log(elements[currentID]);
    });

}

let currentX;
let currentY;

function SnapToBackground(currentID, currentX, currentY){
    let currentDiffX = (parseInt(currentX) - elements[currentID].background_offset_x);
    let currentDiffY = (parseInt(currentY) - elements[currentID].background_offset_y);

    let currentCenterDiffX = (parseInt(currentX)+elements[currentID].width/2) - (elements[currentID].background_offset_x+elements[currentID].background_width/2);
    let currentCenterDiffY = (parseInt(currentX)+elements[currentID].height/2) - (elements[currentID].background_offset_y+elements[currentID].background_height/2);
    //currentY - (elements[currentID].background_size_y/2) - currentX+(elements[currentID].size_y/2);


    if(currentDiffX <= 5 && currentDiffX >= -5 && currentDiffY <= 5 && currentDiffY >= -5){
        currentX += elements[currentID].background_offset_x;
        currentY += elements[currentID].background_offset_y;
    }

    if(currentCenterDiffX <= 5 && currentCenterDiffX >= -5 && currentCenterDiffY <= 5 && currentCenterDiffY >= -5){
        currentX += currentCenterDiffX;
        currentY += currentCenterDiffY;
    }

    if(currentCenterDiffX <= 5 && currentCenterDiffX >= -5)
        currentX += currentCenterDiffX;
    
    if(currentCenterDiffY <= 5 && currentCenterDiffY >= -5)
        currentY += currentCenterDiffY;

}

function Move(element, isParent){
        let currentID = $(element).attr('id').match(/\d+/gim)[0];

        currentX = (currentX-(parseInt($(element).css('width'))/2)).toFixed(2);
        currentY = (currentY-(parseInt($(element).css('height'))/2)).toFixed(2);

        if(currentX.indexOf('.00') != -1)
            currentX = parseInt(currentX);

        if(currentY.indexOf('.00') != -1)
            currentY = parseInt(currentY);

        SnapToBackground(currentID, currentX, currentY);

        if(isParent)
            switch(edit_mode){
                case 1:
                    $(element).children().eq(0).css('left', currentX+'px').css('top', currentY+'px');
                    elements[currentID].offset_x = currentX;
                    elements[currentID].offset_y = currentY;
                    break;

                case 2:
                    $(element).css('left', currentX+'px').css('top', currentY+'px');
                    elements[currentID].background_offset_x = currentX;
                    elements[currentID].background_offset_y = currentY;
                    break;

               // case 3:
               //     $(element).css('left', currentX+'px').css('top', currentY)+'px';
               //     elements[currentID].background_offset_x = currentX;
               //     elements[currentID].background_offset_y = currentY;
//
               //     $(element).children().eq(0).css('left', currentX+'px').css('top', currentY+'px');
               //     elements[currentID].offset_x = currentX;
               //     elements[currentID].offset_y = currentY;
               //     break;
                default:
                    return;
            }
        else
            switch(edit_mode){
                case 1:
                    $(element).css('left', currentX+'px').css('top', currentY+'px');
                    elements[currentID].offset_x = currentX;
                    elements[currentID].offset_y = currentY;
                    break;

                case 2:
                    $(element).parent().eq(0).css('left', currentX+'px').css('top', currentY+'px');
                    elements[currentID].background_offset_x = currentX;
                    elements[currentID].background_offset_y = currentY;
                    break;

               // case 3:
               //     $(element).css('left', currentX+'px').css('top', currentY+'px');
               //     elements[currentID].offset_x = currentX;
               //     elements[currentID].offset_y = currentY;
//
               //     $(element).parent().eq(0).css('left', currentX+'px').css('top', currentY+'px');
               //     elements[currentID].background_offset_x = currentX;
               //     elements[currentID].background_offset_y = currentY;
               //     break;

                default:
                    return;
            }
  
        //console.log(elements, $(element), currentID);

       // console.log(elements[currentID]);
}


$(document).on('click', 'div:not(#form-container):not(#slider-container)', function(){
    if($(this).hasClass("Active")){
        $(this).removeClass('Active');
        $(this).addClass('Hover');
   }

   else{
        $('div').removeClass('Active');
        $(this).removeClass('Hover');
        $(this).addClass('Active');
   }
});


let currentElement;

$(document).on('mousemove', function(e){
    currentX = e.clientX;
    currentY = e.clientY;

    if(move){
        Move($(currentElement), $(currentElement).attr("id").indexOf('_Background') != -1);
    }
});


$(document).on('mouseenter', 'div:not(#form-container):not(#slider-container)', function(){

    if(!$(this).hasClass("Active"))
        $(this).addClass('Hover');

    currentElement = this;

    $(currentElement)
        .on("mousedown", this, function(){
          move = true;
          $('div#form-container').css('display', 'none');
    })
        .on("mouseup", this, function(){
          move = false;
          $('div#form-container').css('display', 'block');
    });
   

}).on('mouseleave', 'div:not(#form-container):not(#slider-container)', function(){
    $(this).removeClass('Hover');
});

$(document).on('keypress', function(e){
    
    let currElement = $('div.Active');

    if(currElement){
        if (e.key == 'x') {
            //if($(currElement).attr("id").indexOf('_Background') != -1){
            if (!confirm("Delete this Element?"))
                return;

            if (elements[$(currElement).attr('id').match(/\d+/gim)].type == 'Slider' && SlidersCount < StaticSlidersCount && $('div.Element').length <= StaticSlidersCount) {
                if (SlidersCount == 0 && document.getElementsByTagName('h2').length > 0)
                    document.getElementsByTagName('h2')[0].style.color = 'Red';

                SlidersCount++
                HowManySliders();
            }


            if (elements[$(currElement).attr('id').match(/\d+/gim)].type == 'Toggle' && TogglesCount < StaticTogglesCount && $('div.Element').length <= StaticTogglesCount) {
                if (TogglesCount == 0 && document.getElementsByTagName('h3').length > 0)
                    document.getElementsByTagName('h3')[0].style.color = 'Yellow';

                TogglesCount++
                HowManyToggles();
            }

            delete elements[$(currElement).attr('id').match(/\d+/gim)];
            $(currElement).remove();

            $('input[type="range"]').remove();
            $('label.SliderLabel').remove();
            $('output').remove();
        }
        //else
        // $(currElement).parent().remove();
        if (e.key == 's') {
            edit_mode = ($(currElement).attr("id").indexOf('_Background') != -1) ? 3 : 1;
            ReSize($(currElement), $(currElement).attr("id").indexOf('_Background') != -1);
        }

        if (e.key == 'c') {
            edit_mode++;

            if ($(currElement).attr("id").indexOf('_Background') != -1 && edit_mode > 3)
                edit_mode = 0;

            else if (($(currElement).attr("id").indexOf('_Background') == -1 && edit_mode > 1))
                edit_mode = 0;

 

            if (edit_mode > 0)
                ReSize($(currElement), $(currElement).attr("id").indexOf('_Background') != -1);
            else {
                $('input[type="range"]').remove();
                $('label.SliderLabel').remove();
                $('output').remove();
            }
        }

        if(e.key == 'g'){
            edit_mode++;

            if ($(currElement).attr("id").indexOf('_Background') != -1 && edit_mode > 2)
                edit_mode = 0;

            else if (($(currElement).attr("id").indexOf('_Background') == -1 && edit_mode > 1))
                edit_mode = 0;

            if (edit_mode > 0)
                Move($(currElement), $(currElement).attr("id").indexOf('_Background') != -1);
        }
    }
});


function GenerateCode(){

    code = `
[Constants]
global $width
global $height
global $offset_x
global $offset_y

[CustomShaderDraw]
local $x87 = x87
local $y87 = y87
local $z87 = z87
local $w87 = w87

x87 = $width/res_width
y87 = $height/res_width
z87 = $offset_x/res_width
w87 = $offset_y/res_width

cs = shader.hlsl
vs = shader.hlsl

x87 = $x87
y87 = $y87
z87 = $z87
w87 = $w87

clear = ps-t100

`;


    elements.forEach((element) =>{
        code += `
${element.header}`;
        if(element.background_draw != undefined)
            code +=`
$width = ${element.background_width}
$height = ${element.background_height}
$offset_x = ${element.background_offset_x}
$offset_y = ${element.background_offset_y}

${element.background_draw}

`;

        
        code += `
$width = ${element.width}
$height = ${element.height}
$offset_x = ${element.offset_x}
$offset_y = ${element.offset_y}

${element.draw}

    `;
    });

    code += `
[CommandListMain]
local $v

`;

    let tempCode = '';

    let currentSlider = 1;

    let currentToggle = 0;

   
    for(let run = 0; run < 2; run++)
        elements.forEach((element) =>{
            if(run == 0)
                code += `run = ${element.header.replace('[', '').replace(']', '')}
`;
            else
                switch(element.type){
                    case 'Toggle':
                        tempCode += `

if $click && $cursor_x >= ${element.offset_x} && $cursor_x <= ${element.offset_x+element.width} && $cursor_x >= ${element.offset_y} && $cursor_y <= ${element.offset_y+element.height}
    ${toggle_variables[currentToggle]} = !${toggle_variables[currentToggle]}`;
                        
                        currentToggle++;
                        break;

                    case 'Slider':
                        tempCode += `

if $selector == ${currentSlider} || $cursor_x >= ${element.offset_x} && $cursor_x <= ${element.offset_x+element.width} && $cursor_y >= ${element.offset_y} && $cursor_y <= ${element.offset_y+element.height}  
    $slider_id = ${currentSlider}
    $Key${currentSlider} = $Key${currentSlider} + $keysteps

if $hover || $click
    $v = ($cursor_x-$off_x)/$size_x
    $Key${currentSlider} = $v
endif

    $Key${currentSlider} = $Key${currentSlider} * ($Key${currentSlider} >= 0.005 && $Key${currentSlider} <= 0.995) + ($Key${currentSlider} > 0.995)
endif
                        `;

                        currentSlider++;
                        break;
                }
        }); 

    code += tempCode;

    $('textarea').val(IniContent+code);

    currentSlider = 1;
}

function ChangeBackground(){
    $('input[name="Background"]').toggle();

   // console.log($('input[name="Background"]')[0].files[0], $('input[name="Background"]')[0].files[0] != undefined);
    if($('input[name="Background"]')[0].files[0] != undefined){
       // console.log(URL.createObjectURL($('input[name="Background"]')[0].files[0]));
        $('body').css('background-image', `url('${URL.createObjectURL($('input[name="Background"]')[0].files[0])}'`).css('background-repeat', 'no-repeat').css('background-size', 'cover');

    }
}

$(document).keypress(function(e){
    if(e.key == '`')
        menu = !menu;

    if(menu){
        $('span#ModeInfo').html(`Idk how to Name it Mode - ON</br>
        </br>
        Press F11 to Toggle FullScreen (Highly Recommended)
        </br>
        </br>
        When this Mode is ON:</br>
        Z - Toggles Form/Menu</br>
        B - Adds Input to change Page Background</br>
        M - Generates Code
        </br>
        </br>
        Keybinds for working with UI Elements:</br>
        S - Scale</br>
        G - Move</br>
        X - Delete</br>
        C - Change Edit Mode (For Scale and Move)`);

        if(e.key == 'z')
            $('div#form-container').toggle();

        if(e.key == 'm')
            GenerateCode();

        if(e.key == 'b')
            ChangeBackground();
    }
    else
        $('span#ModeInfo').html('Press ` (~)');
});



function LoadIni() {
    const fileList = $('input[name="ini"]')[0].files;
    const reader = new FileReader(); 

    reader.addEventListener(
        "load",
        function() {
            IniContent = reader.result.slice(0, reader.result.indexOf('[CommandListBackdrop]'));

            $('textarea').val(IniContent);
            

            HowManySliders();
            HowManyToggles();
        
        },
        false
    );

    reader.readAsText(fileList[0]);
}