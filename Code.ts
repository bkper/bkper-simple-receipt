var __assign = (this && this.__assign) || function () {
  __assign = Object.assign || function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
              if (Object.prototype.hasOwnProperty.call(s, p))
                  t[p] = s[p];
      }
      return t;
  };
  return __assign.apply(this, arguments);
};

function doGet(e) {
    var bookId = e.parameter.bookId;
    var transactionIds = e.parameter.transactionIds;

    var msg = checkProperties(bookId);
    
    
    if(msg ==""){
      if (transactionIds){
        var htmlTemplate = HtmlService.createTemplateFromFile('Dialog');
        htmlTemplate.dataFromServerTemplate = { bookid: bookId, transactionIds: transactionIds, msg:""};
        var htmlOutput = htmlTemplate.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME)
            .setTitle('Receipt');
      }else{
          // No transactions selected
          var htmlTemplate = HtmlService.createTemplateFromFile('Dialog');
          htmlTemplate.dataFromServerTemplate = { bookid: bookId, transactionIds: transactionIds, msg:"Please select some transaction(s) to put on the receipt."};
          var htmlOutput = htmlTemplate.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME)
              .setTitle('Instructions');  
      }  
   }else{
      // No properties 
      var htmlTemplate = HtmlService.createTemplateFromFile('Dialog');
      htmlTemplate.dataFromServerTemplate = { bookid: bookId, transactionIds: transactionIds, msg:msg};
      var htmlOutput = htmlTemplate.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME)
          .setTitle('Instructions');          
  }   
  return htmlOutput;
}

function checkProperties(bookId){
  var book = BkperApp.openById(bookId);
  var properties = book.getProperties();
  var msg ="";
  // check content
  if(!properties.receipt_template){ Logger.log("no template") return "Please set book property receipt_template" }
  if(!properties.receipt_folder_id){Logger.log("no id") return "Please set book property receipt_folder_id"}
  
  //Check for receipt_folder_id
  try{
      DriveApp.getFolderById(properties.receipt_folder_id);
  }catch (e){
    msg = "Please check the book property receipt_folder_id <br><br>" + e
    Logger.log("no no valid id") return msg 
  }
   //Check for receipt_folder_id
   try{
    DriveApp.getFolderById(properties.receipt_folder_id);
   }catch (e){
    msg = "Please check the book property receipt_template <br><br>" + e
    Logger.log("no valid template url") return msg 
   }
  return msg
}

function testCheckProperties(){
  var bookId = "agtzfmJrcGVyLWhyZHITCxIGTGVkZ2VyGICAoITsoaMJDA";
  checkProperties(bookId)
}


function initialize(bookId, transactionIds){
  var book = BkperApp.openById(bookId)
 
  var model = generateModel(book, transactionIds);
  var object = merge(model);
  
  var receiptUrl = object.receiptUrl;
  var receiptName = object.receiptName;
  
  
  return { bookId,   transactionIds, receiptUrl, receiptName}
}



function generateModel(book, transactionIds) {
  // Book Properties
  //var book = BkperApp.openById(bookId);
  var model = {
      book: __assign(__assign({}, book.getProperties()), { name: book.getName() })
  };
  // Account properties
  //var account = book.getAccount(customerName);
  //model.customer = __assign(__assign({}, account.getProperties()), { name: account.getName(), balance: account.getBalance() });
      
  //Logger.log( "account:'"+ customerName + "' after:" + afterDate + " before:"+beforeDate)
  // transactions
  const transactionIdsArray = transactionIds.split(" ");
  var total = 0*1;
  model.transactions = [];
  for (var i = 0; i < transactionIdsArray.length; i++) {
      let transactionId = transactionIdsArray[i];
      let transaction = book.getTransaction(transactionId);
      model.transactions.push({
         date: transaction.getInformedDateText(),
         description: transaction.getDescription(),
         account: transaction.getCreditAccount().getName(),
         amount: transaction.getAmount()
      });
      total +=  Number(transaction.getAmount());
  } 
  //Receipt
  model.receipt = __assign({ total: total ,date :Utilities.formatDate(new Date(),Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')});

 return model;
}


function testGenerateModel(){
  var bookId = "agtzfmJrcGVyLWhyZHITCxIGTGVkZ2VyGICAoITsoaMJDA"
  var transactionIds = "1c13381a-ecc4-4db7-a4ab-48cf19c983d2 3a5b72a6-a4bf-48f6-9e87-c18baf1d9dad"
  var book = BkperApp.openById(bookId)
   generateModel(book, transactionIds)
}


function merge(model) {
  let folderId = model.book.receipt_folder_id;
  let template = model.book.receipt_template;
  

  var params = {   
      'template': template,
      'model': model,
      'format': 'pdf'
  };
  var options = {
      'contentType': "application/json",
      'method': 'post',
      'payload': JSON.stringify(params),
      'muteHttpExceptions': false
  };
  
  var response = UrlFetchApp.fetch('https://api.doxey.io/merge', options);
  var document = response.getBlob();
  var date = Utilities.formatDate(new Date(),Session.getScriptTimeZone(), 'dd-MM-yyyy')
  var receiptName = "Receipt " + date+".pdf";
  document.setName(receiptName);
  var file =DriveApp.getFolderById(folderId).createFile(document);
  var receiptUrl = file.getUrl();
  return {receiptUrl, receiptName}
}

function testMerge(){
  var bookId = "agtzfmJrcGVyLWhyZHITCxIGTGVkZ2VyGICAoITsoaMJDA"
  var transactionIds = "1c13381a-ecc4-4db7-a4ab-48cf19c983d2 3a5b72a6-a4bf-48f6-9e87-c18baf1d9dad"
  var book = BkperApp.openById(bookId)
  const model =  generateModel(book, transactionIds);
  merge(model);
}