const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://dynqaknktorbblducwnt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5bnFha25rdG9yYmJsZHVjd250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMTg0OTIsImV4cCI6MjA5NTY5NDQ5Mn0.wWlcE3Mgh4pIVf4CBIhqT_MhVj3IS0VmgNFQKeqkLPY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('tasks').insert([{ title: 'Test Task' }]);
  console.log("Insert result:", { data, error });
  if(error) {
     console.error(error);
  }
}
test();
