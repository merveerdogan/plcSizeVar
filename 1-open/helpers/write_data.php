<?php
$post_data = json_decode(file_get_contents('php://input'), true);

// Extract folder name and filename from the posted data
$folderName = $post_data['folder_name'];
$fileName = $post_data['filename'] . ".csv";
$data = $post_data['filedata'];

// Construct the path to the data folder (one level up from helpers, then into data)
$dataFolderPath = dirname(__DIR__) . DIRECTORY_SEPARATOR ;

// Create the specific subfolder within data if it doesn't exist
$folderPath = $dataFolderPath . DIRECTORY_SEPARATOR . $folderName;
if (!is_dir($folderPath)) {
    mkdir($folderPath, 0755, true); // Create with proper permissions and recursive
}

// Construct the full path with filename, ensuring correct directory separators
$fullPath = $folderPath . DIRECTORY_SEPARATOR . $fileName;

// Write the file to disk
file_put_contents($fullPath, $data);
?>